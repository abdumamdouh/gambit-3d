import { create } from 'zustand'

interface PromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Chrome/Edge/Android offer an install prompt; iOS uses Share → Add to Home Screen. */
export const useInstall = create<{ evt: PromptEvent | null; installed: boolean }>(() => ({
  evt: null,
  installed: typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches,
}))

addEventListener('beforeinstallprompt', e => { e.preventDefault(); useInstall.setState({ evt: e as PromptEvent }) })
addEventListener('appinstalled', () => useInstall.setState({ evt: null, installed: true }))

export async function install() {
  const e = useInstall.getState().evt
  if (!e) return
  await e.prompt()
  await e.userChoice
  useInstall.setState({ evt: null })
}
