// src/app/shared/comentarios-modal/comentarios-modal.model.ts

export interface Comentario {
  id: string;
  idUsuario: string;
  usuarioNickname?: string;
  comentario: string;
  dataCriacao: string;
}
