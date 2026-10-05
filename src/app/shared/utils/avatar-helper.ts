/**
 * Retorna a URL do avatar do usuário.
 * Se ele já tem avatar, retorna o dele.
 * Se for null, retorna um avatar aleatório estável baseado no ID.
 */
export function getAvatarUrl(usuario: { id?: string; avatar?: string | null } | null | undefined): string {
  if (!usuario) return 'assets/capas/perfilSemFoto.png';

  if (
    usuario.avatar &&
    usuario.avatar.trim() !== '' &&
    usuario.avatar !== 'null' &&
    usuario.avatar !== 'undefined'
  ) {
    return usuario.avatar;
  }

  return getAvatarPadrao(usuario.id);
}

/**
 * Escolhe um dos 9 avatares padrão baseado no ID (estável).
 */
export function getAvatarPadrao(id: string | null | undefined): string {
  if (!id) return 'assets/capas/perfilSemFoto.png';

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }

  const numero = (Math.abs(hash) % 9) + 1;
  return `https://img.bliteca.com.br/avatares/${numero}.png`;
}
