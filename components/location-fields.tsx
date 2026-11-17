'use client';

import { useEffect, useMemo, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import { FormGrid, FormField } from '@/components/form-layout';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface LocationValue {
  country: string;
  city: string;
  address: string;
}

interface LocationFieldsProps {
  country: string;
  city: string;
  address: string;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  idPrefix?: string;
}

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

function spanishName(iso: string, fallback: string): string {
  try {
    return regionNames.of(iso) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Todos los paises, con nombre en espanol y Bolivia primero. */
const COUNTRIES = (() => {
  const all = Country.getAllCountries()
    .map((c) => ({ code: c.isoCode, name: spanishName(c.isoCode, c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const bolivia = all.find((c) => c.code === 'BO');
  return bolivia ? [bolivia, ...all.filter((c) => c.code !== 'BO')] : all;
})();

const byName = (a: string, b: string) => a.localeCompare(b, 'es');

const cleanState = (name: string) => name.replace(/ (Department|Departamento)$/, '');

/** Ciudades de Bolivia que el paquete no trae. Se suman sin duplicar. */
const EXTRA_BO: Record<string, string[]> = {
  Cochabamba: ['Cochabamba', 'Quillacollo', 'Sacaba', 'Colcapirhua', 'Vinto', 'Tiquipaya'],
  'La Paz': ['La Paz', 'El Alto'],
  Beni: ['Trinidad', 'Riberalta'],
  Chuquisaca: ['Sucre'],
  Oruro: ['Oruro'],
  Pando: ['Cobija'],
  Potosí: ['Potosí', 'Villazón', 'Tupiza', 'Uyuni'],
  'Santa Cruz': ['Montero', 'Warnes', 'Camiri'],
  Tarija: ['Tarija', 'Yacuiba', 'Villa Montes'],
};

/**
 * Pais -> Estado/Departamento -> Ciudad -> Direccion.
 * El estado solo filtra las ciudades; no se guarda. Un valor viejo escrito a
 * mano que no este en la lista se conserva como opcion para no perder datos.
 */
export function LocationFields({
  country,
  city,
  address,
  onChange,
  disabled = false,
  idPrefix = 'loc',
}: LocationFieldsProps) {
  const [stateCode, setStateCode] = useState('');

  const countryCode = COUNTRIES.find((c) => c.name === country)?.code ?? '';

  const states = useMemo(
    () =>
      countryCode
        ? [...State.getStatesOfCountry(countryCode)].sort((a, b) => byName(a.name, b.name))
        : [],
    [countryCode],
  );

  // Si ya hay una ciudad guardada, intenta deducir su estado para filtrar bien.
  useEffect(() => {
    if (!countryCode || !city || stateCode || states.length === 0) return;
    const found = City.getCitiesOfCountry(countryCode)?.find((c) => c.name === city);
    if (found?.stateCode) setStateCode(found.stateCode);
  }, [countryCode, city, stateCode, states.length]);

  const known = useMemo(() => {
    if (!countryCode) return [];
    let list;
    if (states.length === 0) list = City.getCitiesOfCountry(countryCode);
    else if (stateCode) list = City.getCitiesOfState(countryCode, stateCode);
    else list = [];
    const stateName = cleanState(states.find((s) => s.isoCode === stateCode)?.name ?? '');
    const extra = (countryCode === 'BO' ? EXTRA_BO[stateName] : undefined) ?? [];
    return Array.from(new Set([...(list ?? []).map((c) => c.name), ...extra])).sort(byName);
  }, [countryCode, stateCode, states]);

  const countryNames = COUNTRIES.map((c) => c.name);
  const countries =
    country && !countryNames.includes(country) ? [country, ...countryNames] : countryNames;
  const cities = city && !known.includes(city) ? [city, ...known] : known;

  const needsState = states.length > 0;
  const noCitiesInDataset = !!countryCode && (!needsState || !!stateCode) && known.length === 0;
  const addressDisabled =
    disabled || !country || (needsState && !stateCode) || (!noCitiesInDataset && !city);

  return (
    <FormGrid>
      <FormField label="País" htmlFor={idPrefix + '-country'}>
        <Select
          value={country}
          onValueChange={(value) => {
            setStateCode('');
            onChange({ country: value, city: '', address });
          }}
          disabled={disabled}
        >
          <SelectTrigger id={idPrefix + '-country'}>
            <SelectValue placeholder="Selecciona un país" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {countries.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Estado / Departamento" htmlFor={idPrefix + '-state'}>
        <Select
          value={stateCode}
          onValueChange={(value) => {
            setStateCode(value);
            onChange({ country, city: '', address });
          }}
          disabled={disabled || !country || states.length === 0}
        >
          <SelectTrigger id={idPrefix + '-state'}>
            <SelectValue
              placeholder={
                !country
                  ? 'Primero elige un país'
                  : states.length === 0
                    ? 'No aplica para este país'
                    : 'Selecciona un estado'
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {states.map((s) => (
              <SelectItem key={s.isoCode} value={s.isoCode}>
                {cleanState(s.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Ciudad" htmlFor={idPrefix + '-city'} className="sm:col-span-2">
        {noCitiesInDataset ? (
          <Input
            id={idPrefix + '-city'}
            value={city}
            onChange={(e) => onChange({ country, city: e.target.value, address })}
            placeholder="Escribe la ciudad"
            disabled={disabled}
          />
        ) : (
          <Select
            value={city}
            onValueChange={(value) => onChange({ country, city: value, address })}
            disabled={disabled || !country || (needsState && !stateCode)}
          >
            <SelectTrigger id={idPrefix + '-city'}>
              <SelectValue
                placeholder={
                  !country
                    ? 'Primero elige un país'
                    : needsState && !stateCode
                      ? 'Primero elige un estado'
                      : 'Selecciona una ciudad'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {cities.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="Dirección" htmlFor={idPrefix + '-address'} className="sm:col-span-2">
        <Input
          id={idPrefix + '-address'}
          value={address}
          onChange={(e) => onChange({ country, city, address: e.target.value })}
          placeholder={addressDisabled ? 'Primero elige país, estado y ciudad' : 'Calle, número, zona'}
          disabled={addressDisabled}
        />
      </FormField>
    </FormGrid>
  );
}