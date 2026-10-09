import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer, audioUrl, clock } from './AudioPlayer'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))

describe('odtwarzacz nagrania', () => {
  // jsdom nie odtwarza dzwieku - play/pause tylko udajemy
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { value: false, configurable: true })
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { value: true, configurable: true })
      this.dispatchEvent(new Event('pause'))
    })
  })
  afterEach(() => vi.restoreAllMocks())

  const player = () =>
    render(<AudioPlayer src="audio/edu/001.mp3?v=1" seconds={830} bytes={4981665} title="1. Test" note="nagranie wersji pełnej" />)

  it('przed pobraniem pokazuje dlugosc i rozmiar, nic nie wczytuje', () => {
    player()
    expect(screen.getByText(/nagranie wersji pełnej\s·\s13:50\s·\s5,0\sMB/)).toBeInTheDocument()
    expect(document.querySelector('audio')?.getAttribute('preload')).toBe('none')
  })

  it('odtwarza i zatrzymuje', () => {
    player()
    fireEvent.click(screen.getByRole('button', { name: 'Odtwórz' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Pauza' }))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('tempo suwakiem: zmienia playbackRate, zostaje na urzadzeniu, wraca do 1x', () => {
    player()
    const audio = document.querySelector('audio') as HTMLAudioElement
    const slider = screen.getByRole('slider', { name: /Tempo/ })
    fireEvent.change(slider, { target: { value: '1.35' } })
    expect(audio.playbackRate).toBeCloseTo(1.35)
    expect(audio.preservesPitch).toBe(true)
    expect(localStorage.getItem('zywe-slowo:audio:rate')).toBe('1.35')
    expect(screen.getByRole('button', { name: 'Normalne tempo' })).toHaveTextContent('1,35×')
    fireEvent.click(screen.getByRole('button', { name: 'Normalne tempo' }))
    expect(audio.playbackRate).toBe(1)
  })

  it('zapamietane tempo obowiazuje w kolejnym nagraniu', () => {
    localStorage.setItem('zywe-slowo:audio:rate', '0.8')
    player()
    expect((document.querySelector('audio') as HTMLAudioElement).playbackRate).toBeCloseTo(0.8)
  })

  it('format czasu i adres pliku', () => {
    expect(clock(830)).toBe('13:50')
    expect(clock(3725)).toBe('1:02:05')
    expect(audioUrl('audio/edu/001.mp3')).toBe('/audio/edu/001.mp3')
  })
})
