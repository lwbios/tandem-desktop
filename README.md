<p align="center">
  <img src="assets/icon.png" width="112" alt="Tandem">
</p>

<h1 align="center">Tandem</h1>

<p align="center">
  Uma pílula no topo da tela que mostra o que está acontecendo no seu PC,<br>
  e um lançador que abre tudo com <b>Alt+Espaço</b>.
</p>

<p align="center">
  <a href="https://github.com/lwbios/tandem-desktop/releases/latest"><b>⬇ Baixar para Windows</b></a>
  &nbsp;·&nbsp;
  <a href="#recursos">Recursos</a>
  &nbsp;·&nbsp;
  <a href="#atalhos">Atalhos</a>
  &nbsp;·&nbsp;
  <a href="#perguntas-frequentes">Perguntas frequentes</a>
</p>

---

## Instalação

1. Baixe o **Tandem Setup.exe** na [página de downloads](https://github.com/lwbios/tandem-desktop/releases/latest).
2. Abra o instalador e siga os passos. O Tandem abre sozinho no final.
3. Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo**. Isso acontece porque o instalador ainda não tem assinatura digital.

Pronto: a pílula aparece no topo da tela e o ícone do Tandem fica na bandeja, perto do relógio. Clique duas vezes nele para abrir as configurações.

**Requisitos:** Windows 10 ou 11.

---

## Recursos

### A pílula

Fica no topo da tela, discreta, e cresce com uma animação suave quando algo acontece. Passe o mouse em cima para ver mais detalhes. Fora dela, os cliques passam direto para o que está atrás.

| | |
| --- | --- |
| 🎵 **Tocando agora** | Capa do álbum e equalizador para Spotify, YouTube e qualquer app de mídia. Com o mouse em cima: título, artista, progresso e os botões ⏮ ⏯ ⏭. |
| 🔊 **Volume** | Aviso com barra sempre que o volume muda. A rodinha do mouse sobre a pílula ajusta o volume. |
| 🎧 **Fones e saída de áudio** | Ao conectar um fone, mostra o nome e a bateria (em fones Bluetooth compatíveis). Troque a saída de áudio com o botão direito. |
| 🎙️ **Microfone e chamadas** | Bolinha amarela quando algum app usa o microfone, com o ícone do app e um medidor de voz. Microfone mudo vira um ícone vermelho; clique para mutar ou desmutar. No Discord, mostra o servidor e o canal. |
| 📷 **Câmera** | Bolinha verde enquanto algum app usa a câmera. |
| 🔴 **Gravação no OBS** | "REC" ou "AO VIVO" com o tempo decorrido, sem precisar configurar nada no OBS. |
| ⏱️ **Timer** | Tempos rápidos na pílula ou no botão direito. Ao terminar, a pílula balança e toca um aviso. |
| 🔋 **Bateria** | Aviso de "Carregando" ao ligar o carregador. |
| 🎮 **Tela cheia** | Em jogos e vídeos em tela cheia, a pílula sai da frente sozinha. |

### O lançador (Alt+Espaço)

Uma barra de busca que abre em cima de qualquer janela. Comece a digitar:

| Digite | O que acontece |
| --- | --- |
| `chrome`, `discord`, `vsc` | Abre qualquer app instalado |
| `2,5*4+10`, `sqrt(16)` | Calculadora (Enter copia o resultado) |
| `10 km em milhas`, `30 c em f`, `2 gb em mb` | Converte unidades |
| `100 usd em brl` | Converte moedas com a cotação do dia |
| `hoje`, `hora em tóquio`, `dias até natal` | Datas, fusos horários e contagens |
| `#ff9f0a`, `rgb(255, 0, 0)` | Mostra a cor e converte entre HEX, RGB e HSL |
| `timer 15`, `timer 1h30` | Inicia um timer na pílula |
| `foco 50` | Modo foco: timer roxo e apps que distraem ficam fora da frente |
| `yt lofi`, `g receita`, `maps padaria`, `tr hello` | Busca direto no YouTube, Google, Maps, Tradutor… |
| `relatorio` | Encontra arquivos no seu PC |
| `fechar spotify` | Fecha um app aberto |
| `senha`, `uuid` | Gera uma senha forte ou um UUID |
| `maiúsculas`, `camel`, `acentos` | Transforma o texto que você copiou e cola o resultado |
| `;data` | Cola um snippet (texto pronto) |

E também:

- **Histórico da área de transferência**: tudo o que você copiou (textos e imagens), com prévia. Enter cola no app em que você estava.
- **Emojis e símbolos**: busca em português ou inglês.
- **Prints recentes**: seus últimos prints em uma grade; arraste direto para o Discord ou para uma pasta.
- **Janelas**: metade esquerda, metade direita, maximizar, centralizar…
- **Sistema**: bloquear, suspender, reiniciar, desligar, esvaziar a lixeira, modo escuro, mudo.

### Notas rápidas

Uma janelinha de notas que fica por cima das outras e salva enquanto você digita. Abra com **Ctrl+Alt+N**.

### Hyper Key

Opcional, em **Configurações → Geral**: segurando o **Caps Lock**, ele vira Ctrl+Alt+Shift+Win, para você criar atalhos que não batem com nenhum outro programa. Um toque rápido continua ligando o Caps Lock.

---

## Atalhos

| Atalho | Ação |
| --- | --- |
| **Alt+Espaço** | Abrir o lançador |
| **Ctrl+Alt+N** | Abrir/fechar as notas |
| **Ctrl+Alt+I** | Mostrar/ocultar a pílula |
| **Ctrl+Alt+O** | Abrir as configurações |

Todos podem ser trocados em **Configurações → Atalhos**, onde também dá para criar atalhos para mutar o microfone e tocar/pausar a música.

## Configurações

Clique duas vezes no ícone da bandeja (ou use **Ctrl+Alt+O**). Lá você pode:

- ligar ou desligar cada recurso da pílula;
- mudar o tamanho e a posição da pílula;
- criar snippets, quicklinks e pastas favoritas;
- escolher os apps bloqueados no modo foco;
- iniciar o Tandem junto com o Windows.

## Privacidade

Tudo roda no seu computador. O Tandem não tem conta, não coleta dados e não envia nada para a internet, exceto:

- a cotação de moedas, quando você pede uma conversão (serviço público do Banco Central Europeu);
- as buscas na web que você mesmo abre.

O histórico da área de transferência fica só no seu PC e ignora senhas copiadas de gerenciadores de senha.

## Perguntas frequentes

**A pílula sumiu.** Ela se esconde em tela cheia. Se não for isso, aperte **Ctrl+Alt+I**.

**O nome do servidor do Discord está errado.** Ele vem do canal aberto na janela do Discord, que nem sempre é o canal de voz.

**Mutei no Discord e a pílula não mostrou.** A pílula mostra o mudo do microfone do Windows; o mudo dentro de cada app não é visível para ela.

**Meu fone não mostra a bateria.** Só aparece em fones Bluetooth que informam a bateria ao Windows.

**Funciona em dois monitores?** A pílula fica no monitor principal.

---

<details>
<summary><b>Para desenvolvedores</b></summary>

### Rodar a partir do código

Precisa do [Node.js](https://nodejs.org/) 18 ou mais novo.

```bash
npm install
npm start
```

### Gerar o instalador

```bash
npm run dist
```

O instalador sai em `dist/`. A versão instalada guarda as configurações em `%APPDATA%\Tandem`.

### Como o projeto é organizado

| Arquivo | Papel |
| --- | --- |
| `main.js` | Processo principal do Electron: janela da pílula, bandeja, atalhos globais, modo foco e leitura do log do OBS. |
| `index.html`, `style.css`, `renderer.js`, `preload.js` | A pílula: estados, animações, timer, relógio e bateria. |
| `media.ps1` | Processo PowerShell que envia uma linha JSON por evento (mídia, volume, saída de áudio, microfone, câmera, tela cheia, janela em foco) e recebe comandos pela entrada padrão. |
| `native.cs` | Código nativo carregado pelo PowerShell: Core Audio, câmera (Media Foundation), tela cheia, janelas e Hyper Key. |
| `settings.js`, `settings/` | Configurações salvas e a janela de configurações. |
| `launcher-main.js`, `launcher/` | O lançador: apps, histórico da área de transferência, ações, calculadora, conversores e emojis. |
| `notes-main.js`, `notes/` | A janela de notas. |
| `assets/`, `scripts/make-icons.ps1` | Logo e ícones; o script gera todos os ícones a partir de `assets/logo.png`. |

</details>
