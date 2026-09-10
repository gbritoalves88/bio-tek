export interface BookInfo {
  titulo: string;
  autor: string;
  confianca: number;

  // 🆕 Campos opcionais (só vêm do ImageHash)
  idLivro?: string;
  imagemUrl?: string;
  fonte?: string;
}
