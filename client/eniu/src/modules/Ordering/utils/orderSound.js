/**
 * Aviso sonoro de pedido nuevo, sintetizado: no hay archivo que descargar.
 *
 * Los navegadores no dejan sonar nada hasta que la persona toca la página, así
 * que el sonido se "desbloquea" con un clic (`unlockOrderSound`). La
 * preferencia se recuerda, pero el desbloqueo hay que repetirlo en cada carga:
 * `OrdersPage` lo hace con el primer toque en cualquier parte de la pantalla.
 */
const PREFERENCE_KEY = "eniu_order_sound";

let context = null;

export function soundPreference() {
  try {
    return localStorage.getItem(PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function rememberSoundPreference(enabled) {
  try {
    localStorage.setItem(PREFERENCE_KEY, enabled ? "on" : "off");
  } catch {
    // Sin almacenamiento, la preferencia dura lo que la pestaña.
  }
}

export async function unlockOrderSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  context = context || new AudioContextClass();
  try {
    await context.resume();
  } catch {
    return false;
  }
  return context.state === "running";
}

export function orderSoundReady() {
  return context?.state === "running";
}

/** Dos tonos cortos ascendentes. Devuelve false si el navegador no lo permitió. */
export function playNewOrderSound() {
  if (!orderSoundReady()) return false;
  const start = context.currentTime;
  [[880, 0], [1318.5, 0.16]].forEach(([frequency, offset]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.3);
  });
  return true;
}
