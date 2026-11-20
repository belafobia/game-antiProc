// Formatos das respostas da API (espelham os schemas do backend).

export type TokenOut = {
  access_token: string;
  token_type: string;
};

export type Me = {
  id: string;
  email: string;
  display_name: string;
};
