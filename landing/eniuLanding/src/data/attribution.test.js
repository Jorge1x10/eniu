import { describe, expect, it } from 'vitest'
import {
  appendParams,
  buildAttribution,
  campaignOf,
  cleanReferrer,
  cookieString,
  deserializeAttribution,
  parseCampaign,
  readCookie,
  serializeAttribution,
} from './attribution.js'

describe('parámetros de campaña', () => {
  it('recoge las utm y los identificadores de clic', () => {
    const found = parseCampaign('?utm_source=instagram&utm_campaign=cinta&fbclid=abc&otro=1')
    expect(found).toEqual({ utm_source: 'instagram', utm_campaign: 'cinta', fbclid: 'abc' })
  })

  it('ignora una visita sin campaña', () => {
    expect(parseCampaign('')).toEqual({})
    expect(parseCampaign('?ref=algo')).toEqual({})
  })

  it('recorta un valor absurdamente largo', () => {
    const found = parseCampaign(`?utm_campaign=${'x'.repeat(400)}`)
    expect(found.utm_campaign).toHaveLength(120)
  })
})

describe('origen de la visita', () => {
  it('guarda sólo el origen del sitio que enlazó', () => {
    expect(cleanReferrer('https://l.instagram.com/algo?fbclid=x', 'eniu.app')).toBe('https://l.instagram.com')
  })

  it('un salto dentro del propio sitio no es un origen', () => {
    expect(cleanReferrer('https://eniu.app/primeros-pasos', 'eniu.app')).toBe('')
    expect(cleanReferrer('https://app.eniu.app/register', 'eniu.app')).toBe('')
  })

  it('aguanta un referrer que no es una dirección', () => {
    expect(cleanReferrer('vaya', 'eniu.app')).toBe('')
    expect(cleanReferrer('', 'eniu.app')).toBe('')
  })
})

describe('qué se guarda', () => {
  const visita = {
    search: '?utm_source=tiktok&utm_medium=organico',
    referrer: 'https://www.tiktok.com/',
    pathname: '/',
    host: 'eniu.app',
    now: Date.parse('2026-09-07T12:00:00Z'),
  }

  it('una visita con campaña se guarda entera', () => {
    expect(buildAttribution(visita)).toEqual({
      utm_source: 'tiktok',
      utm_medium: 'organico',
      referrer: 'https://www.tiktok.com',
      landing: '/',
      ts: '2026-09-07T12:00:00.000Z',
    })
  })

  it('una visita directa posterior no borra la campaña anterior', () => {
    const guardado = buildAttribution(visita)
    const directa = buildAttribution({ search: '', referrer: '', pathname: '/planes', stored: guardado })
    expect(directa).toBe(guardado)
  })

  it('gana el último clic con campaña', () => {
    const guardado = buildAttribution(visita)
    const nueva = buildAttribution({ ...visita, search: '?utm_source=meta', stored: guardado })
    expect(nueva.utm_source).toBe('meta')
    // La utm anterior no se arrastra: el origen es el de esta visita, no una
    // mezcla de las dos.
    expect(nueva.utm_medium).toBeUndefined()
  })
})

describe('ida y vuelta de la cookie', () => {
  it('lo guardado se vuelve a leer igual', () => {
    const value = { utm_source: 'meta', utm_campaign: 'cinta & precio', landing: '/' }
    expect(deserializeAttribution(serializeAttribution(value))).toEqual(value)
  })

  it('una cookie corrupta no rompe nada', () => {
    expect(deserializeAttribution('no-es-json')).toBe(null)
    expect(deserializeAttribution('')).toBe(null)
  })

  it('encuentra la cookie entre otras', () => {
    expect(readCookie('_ga=1; eniu_attr=abc; otra=2')).toBe('abc')
    expect(readCookie('_ga=1')).toBe(null)
  })

  it('declara el dominio compartido sólo cuando cuelga de eniu.app', () => {
    const value = { utm_source: 'meta' }
    expect(cookieString(value, { hostname: 'eniu.app' })).toContain('domain=.eniu.app')
    expect(cookieString(value, { hostname: 'app.eniu.app' })).toContain('domain=.eniu.app')
    // Escribir el dominio desde otro host hace que el navegador descarte la
    // cookie entera, así que en local y en las vistas previas no se declara.
    expect(cookieString(value, { hostname: 'localhost' })).not.toContain('domain=')
    expect(cookieString(value, { hostname: 'eniu-landing.vercel.app' })).not.toContain('domain=')
  })

  it('no marca secure cuando no hay https', () => {
    expect(cookieString({}, { hostname: 'localhost', secure: false })).not.toContain('secure')
  })
})

describe('propagación al registro', () => {
  it('cuelga los parámetros del destino', () => {
    const url = appendParams('https://app.eniu.app/register', { utm_source: 'meta', utm_campaign: 'cinta' })
    expect(url).toBe('https://app.eniu.app/register?utm_source=meta&utm_campaign=cinta')
  })

  it('no pisa lo que el destino ya traía', () => {
    const url = appendParams('https://app.eniu.app/register?utm_source=directo', { utm_source: 'meta' })
    expect(url).toBe('https://app.eniu.app/register?utm_source=directo')
  })

  it('deja intacto un destino que no es una dirección', () => {
    expect(appendParams('#empieza', { utm_source: 'meta' })).toBe('#empieza')
  })

  it('sólo propaga campaña, no lo demás que se guarda', () => {
    const guardado = { utm_source: 'meta', referrer: 'https://facebook.com', landing: '/', ts: 'x' }
    expect(campaignOf(guardado)).toEqual({ utm_source: 'meta' })
    expect(campaignOf(null)).toEqual({})
  })
})
