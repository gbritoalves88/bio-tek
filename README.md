# BliTeca — Frontend

Aplicação frontend do **BliTeca**, uma plataforma de leitura e organização de biblioteca pessoal, com recursos sociais e acompanhamento da jornada literária.

Desenvolvida com Angular e TypeScript, a aplicação pode ser executada no navegador e empacotada como aplicativo Android utilizando Capacitor.

App: https://play.google.com/store/apps/details?id=com.bliteca.app

Repositório: https://github.com/gbritoalves88/bio-tek

## Visão geral

O BliTeca permite que leitores organizem suas bibliotecas, acompanhem seu progresso de leitura, descubram livros e interajam com outros usuários.

O frontend é responsável pela interface, navegação, autenticação, integração com recursos do dispositivo e comunicação com a API backend.

## Funcionalidades

### Biblioteca e catálogo
- Consulta e pesquisa de livros.
- Organização da biblioteca pessoal.
- Adição de livros à biblioteca.
- Consulta por categorias e gêneros.
- Paginação e filtros.
- Importação e pesquisa de livros no catálogo externo.
- Visualização de informações detalhadas dos livros.

### Leitura digital
- Leitor de arquivos PDF.
- Leitor de arquivos EPUB.
- Navegação entre páginas e capítulos.
- Controle de zoom.
- Modo escuro para leitura de PDF.
- Salvamento e restauração do progresso de leitura.

### Reconhecimento de livros
- Captura de imagens utilizando a câmera.
- Reconhecimento de texto por OCR com Tesseract.js.
- Processamento de imagem para melhorar a identificação do texto.
- Busca visual de livros por imagem da capa, integrada ao recurso de pHash da API.
- Apresentação de resultados para seleção do livro identificado.

### Comunidade e recursos sociais
- Feed de atividades da comunidade.
- Curtidas e comentários.
- Pesquisa de usuários.
- Seguir e deixar de seguir leitores.
- Visualização de perfis e atividades.

### Perfil do usuário
- Edição de informações pessoais.
- Configuração de nickname e biografia.
- Personalização de avatar.
- Seleção de tema visual.
- Acompanhamento de atividades e progresso.

### Autenticação
- Login com Google.
- Integração com Google OAuth.
- Persistência local da sessão.
- Interceptor HTTP para envio do token JWT.
- Renovação automática da sessão utilizando refresh token.
- Guards para proteção das rotas.

### Notificações
- Integração com Firebase Cloud Messaging.
- Notificações push para navegador.
- Notificações push no Android.
- Gerenciamento de permissões e registro de dispositivos.
- Notificações em segundo plano.

### Administração
- Dashboard administrativo.
- Consulta e gerenciamento de usuários.
- Moderação de comentários.
- Gerenciamento de livros.
- Exportação de relatórios em CSV.

## Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| Angular 21 | Framework frontend |
| TypeScript 5.9 | Linguagem principal |
| SCSS | Estilização |
| RxJS 7 | Programação reativa e fluxos assíncronos |
| Angular Router | Navegação e rotas |
| Angular HTTP Client | Comunicação com a API |
| Angular SSR | Renderização no servidor e hidratação |
| Capacitor 8 | Integração com recursos nativos |
| Firebase 12 | Integração com Firebase |
| Firebase Cloud Messaging | Notificações push |
| Tesseract.js 7 | Reconhecimento óptico de caracteres (OCR) |
| ZXing | Leitura e reconhecimento de códigos |
| PDF.js | Renderização de documentos PDF |
| epub.js | Leitura de arquivos EPUB |
| Vitest | Testes unitários |

## Arquitetura do projeto

O projeto utiliza componentes standalone do Angular e organização por funcionalidades.

```text
bio-tek/
├── android/                    # Projeto Android / Capacitor
├── public/                     # Arquivos públicos e documentos
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/          # Proteção de rotas
│   │   │   ├── interceptors/    # Interceptores HTTP
│   │   │   └── services/       # Serviços centrais
│   │   │
│   │   ├── features/
│   │   │   ├── admin/           # Administração
│   │   │   ├── biblioteca/      # Biblioteca e catálogo
│   │   │   ├── comunidade/      # Feed e recursos sociais
│   │   │   ├── home/            # Página inicial
│   │   │   ├── login/           # Autenticação
│   │   │   ├── perfil/          # Perfil e atividades
│   │   │   ├── splash/          # Tela inicial
│   │   │   └── termos/          # Termos de uso
│   │   │
│   │   ├── layout/
│   │   │   └── shell/           # Estrutura principal da aplicação
│   │   │
│   │   └── shared/
│   │       ├── book-scanner/    # Scanner de livros e OCR
│   │       ├── capa-hash/       # Busca visual por capa
│   │       ├── leitor/          # Leitores PDF e EPUB
│   │       ├── livro/           # Componentes de livros
│   │       └── services/        # Serviços compartilhados
│   │
│   ├── assets/                  # Imagens, ícones e recursos
│   ├── firebase-messaging-sw.js # Service Worker do Firebase
│   ├── styles.scss              # Estilos globais
│   └── main.ts                  # Inicialização da aplicação
│
├── angular.json
├── capacitor.config.ts
├── package.json
├── tsconfig.json
└── vercel.json
```

## Integração com o backend

O frontend consome a API REST do BliTeca, desenvolvida em ASP.NET Core 8.

A comunicação é centralizada em serviços Angular que utilizam o `HttpClient`.

Principais integrações:

- Autenticação e renovação de sessão.
- Consulta e gerenciamento de livros.
- Biblioteca e catálogo.
- Perfis e comunidade.
- Comentários e avaliações.
- Seguidores.
- Upload de imagens.
- Busca visual por capa.
- Notificações.

A URL da API é obtida pela configuração de ambiente `environment.apiUrl`.

## Configuração do ambiente

### Pré-requisitos

- Node.js em versão compatível com Angular 21.
- npm.
- Android Studio e Android SDK para desenvolvimento Android.
- JDK compatível com a versão do Gradle utilizada pelo projeto.

### Instalação

Clone o repositório:

```bash
git clone https://github.com/gbritoalves88/bio-tek.git
```

Entre na pasta:

```bash
cd bio-tek
```

Instale as dependências:

```bash
npm install
```

### Variáveis e configurações

Configure os arquivos de ambiente utilizados pela aplicação.

O frontend utiliza as seguintes propriedades:

| Configuração | Finalidade |
|---|---|
| `apiUrl` | Endereço da API backend |
| `google.redirectUri` | URI de redirecionamento do login Google |
| `firebase.apiKey` | Configuração do Firebase |
| `firebase.authDomain` | Domínio de autenticação |
| `firebase.projectId` | Identificação do projeto |
| `firebase.storageBucket` | Bucket configurado no Firebase |
| `firebase.messagingSenderId` | Identificação do remetente |
| `firebase.appId` | Identificação da aplicação |
| `firebase.vapidKey` | Chave pública VAPID para notificações web |

Os arquivos de ambiente devem seguir a estrutura esperada pelos imports do projeto.

Não inclua credenciais privadas, chaves de assinatura ou arquivos de serviço no controle de versão.

**Importante:** as configurações Firebase e identificadores OAuth utilizados no frontend são configurações de cliente. Elas não substituem as regras de segurança e validação no backend.

## Executando a aplicação

### Desenvolvimento web

Inicie o servidor Angular:

```bash
npm start
```

A aplicação ficará disponível em:

```text
http://localhost:4200
```

### Build de produção

Execute:

```bash
npm run build
```

Os arquivos compilados serão gerados em:

```text
dist/bio-tek/browser/
```

### Testes

Execute os testes unitários:

```bash
npm test
```

## Aplicativo Android

O projeto utiliza Capacitor para integrar a aplicação Angular ao ambiente Android.

Identificação do aplicativo:

```text
App name: BliTeca
App ID: com.bliteca.app
```

O diretório configurado para os arquivos web compilados é:

```text
dist/bio-tek/browser
```

### Sincronização com Android

Após compilar a aplicação:

```bash
npm run build
npx cap sync android
```

### Abrir no Android Studio

```bash
npx cap open android
```

A partir do Android Studio, é possível executar o aplicativo em um dispositivo ou emulador e gerar o pacote de instalação.

### Assinatura de release

O projeto possui configuração de assinatura de release por meio de `keystore.properties`.

Esse arquivo e o keystore devem ser mantidos fora do repositório.

## Publicação

O projeto possui configuração de build e roteamento para publicação na Vercel por meio de `vercel.json`.

A configuração define:

- Comando de build de produção.
- Diretório de saída `dist/bio-tek/browser`.
- Regras de roteamento para arquivos estáticos.
- Redirecionamento de rotas da aplicação para `index.html`.

A aplicação também possui arquivos públicos relacionados a privacidade, exclusão de conta e associação de links Android.

## Segurança

O frontend implementa mecanismos de apoio à segurança da aplicação:

- Guards para controle de acesso às rotas.
- Interceptor para envio de JWT.
- Renovação de sessão utilizando refresh token.
- Separação entre funcionalidades públicas e autenticadas.
- Configuração de assinatura para builds Android.

A autorização efetiva dos recursos deve ser sempre validada pela API backend. Guards e interceptors no frontend não substituem a validação de permissões no servidor.

## Projeto relacionado

**Backend:** https://github.com/gbritoalves88/bio-tek-api

O backend fornece os serviços REST, autenticação, persistência de dados, gerenciamento de usuários, catálogo, biblioteca, comunidade e integrações utilizadas pelo aplicativo.

---

Desenvolvido como parte do projeto BliTeca.
