'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL, getToken } from '@/lib/api-client';
import type { SupportTicketDto, SupportTicketMessageDto } from '@/lib/api/support';

interface UseSupportSocketOptions {
  /** Ticket abierto en pantalla; se sigue su hilo mientras esté montado. */
  ticketId?: string | null;
  onMessage?: (ticketId: string, message: SupportTicketMessageDto) => void;
  onTicketUpdated?: (ticket: SupportTicketDto) => void;
}

/**
 * Conexión de solo lectura al gateway de soporte.
 *
 * El socket nunca escribe: enviar un mensaje es un POST normal, y lo que llega
 * por aquí es la retransmisión de algo que el backend ya guardó. Si la conexión
 * cae, `connected` pasa a false y la pantalla vuelve a refrescar por REST.
 *
 * socket.io-client se carga con `import()` dentro del efecto para no meterlo en
 * el bundle de las pantallas que no lo usan.
 */
export function useSupportSocket({
  ticketId,
  onMessage,
  onTicketUpdated,
}: UseSupportSocketOptions) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Los handlers cambian en cada render; guardarlos en un ref evita reconectar
  // el socket cada vez que el componente se vuelve a pintar.
  const handlersRef = useRef({ onMessage, onTicketUpdated });
  handlersRef.current = { onMessage, onTicketUpdated };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    let socket: Socket | null = null;

    void (async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      // El navegador no puede poner una cabecera Authorization en un WebSocket;
      // el token viaja en el handshake y el gateway lo verifica con el mismo
      // JwtService que el resto de la API.
      socket = io(`${API_BASE_URL}/support`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      socket.on(
        'ticket:message',
        (payload: { ticketId: string; message: SupportTicketMessageDto }) => {
          handlersRef.current.onMessage?.(payload.ticketId, payload.message);
        },
      );

      socket.on('ticket:updated', (payload: { ticket: SupportTicketDto }) => {
        handlersRef.current.onTicketUpdated?.(payload.ticket);
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  // Suscripción al hilo abierto. El gateway comprueba contra la base que el
  // usuario pueda leerlo antes de meterlo en la sala.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !ticketId) return;

    const subscribe = () => socket.emit('ticket:subscribe', ticketId);
    subscribe();
    socket.on('connect', subscribe);

    return () => {
      socket.off('connect', subscribe);
      socket.emit('ticket:unsubscribe', ticketId);
    };
  }, [ticketId, connected]);

  return { connected };
}
