# Tandem Desktop

Uma pílula no topo da tela do Windows, inspirada na Dynamic Island, que se expande com animações elásticas para mostrar o que está acontecendo no PC.

## O que ela faz

- **Tocando agora**: capa do álbum e equalizador animado para qualquer app que publique mídia no Windows (Spotify, YouTube no navegador...). Passe o mouse para ver título, artista, barra de progresso e os controles ⏮ ⏯ ⏭.
- **Volume**: aviso com barra sempre que o volume do sistema muda. Com o mouse sobre a ilha, a rodinha do mouse ajusta o volume.
- **Timer**: botões de 1/5/10/25 min na ilha aberta ou pelo clique direito. A contagem aparece ao lado da música, e ao terminar a ilha treme e toca um alarme.
- **Microfone / chamadas**: detecta quais apps estão usando o microfone e mostra o ícone do app com um medidor de voz. Fora da visão de chamada, aparece uma bolinha amarela; com o mic mudo, um microfone vermelho riscado. Clique para mutar/desmutar.
- **Discord**: durante uma chamada, mostra o nome do servidor e do canal (lidos do título da janela do Discord).
- **Câmera em uso**: bolinha verde enquanto algum app transmite da câmera (mesma fonte do aviso de câmera do Windows).
- **Gravação no OBS**: "REC" (ou "AO VIVO") com o tempo decorrido e uma bolinha vermelha piscando. Lido do log do OBS, sem precisar ativar o WebSocket nem senha.
- **Saída de áudio e fones Bluetooth**: ao trocar a saída (ex.: conectar um fone), aparece o nome do dispositivo e, em fones Bluetooth que informam, a bateria. Clique direito na ilha para escolher a saída de áudio.
- **Tela cheia e jogos**: a ilha some sozinha quando um jogo ou app em tela cheia está na frente no monitor principal, e volta quando você sai.
- **Bateria**: aviso de "Carregando" ao conectar o carregador; relógio, data e bateria na ilha aberta quando nada está tocando.

Fora da pílula os cliques passam direto para o que está atrás, então ela não atrapalha.

## Lançador (Alt+Espaço)

Inspirado no Raycast: uma barra de busca que abre em cima de tudo.

- **Aplicativos**: todos os apps do menu Iniciar (inclusive os da Microsoft Store), com ícone.
- **Calculadora**: digite uma conta (`2,5*4`, `(1+2)^3`, `sqrt(16)+pi`) e Enter copia o resultado.
- **Quicklinks**: `yt lofi`, `g receita de bolo`, `gh electron`, `tr hello world`, `maps padaria`, `wiki brasil`. Dá para criar os seus nas configurações.
- **Histórico da área de transferência**: textos e imagens copiados, com prévia; Enter cola no app em que você estava, Del apaga. Fica só no seu PC e ignora senhas marcadas por gerenciadores de senha.
- **Emojis e símbolos**: busca em português ou inglês; Enter cola.
- **Janelas**: metade esquerda/direita/cima/baixo, maximizar, quase maximizar, centralizar e restaurar a janela em que você estava.
- **Sistema**: bloquear, suspender, reiniciar, desligar, sair da conta, esvaziar lixeira (pedem confirmação), alternar modo escuro, mudo, microfone, tocar/pausar, Gerenciador de Tarefas, Downloads e Configurações do Windows.
- Qualquer outra busca vira **Pesquisar na web**.

## Requisitos

- Windows 10 ou 11
- [Node.js](https://nodejs.org/) 18+
- Windows PowerShell 5.1 (já vem com o Windows)

## Como rodar

```bash
npm install
npm start
```

O ícone do Tandem aparece na bandeja do sistema. Clique duas vezes nele (ou use **Ctrl+Alt+O**) para abrir as **Configurações**:

- **Geral**: iniciar com o Windows e esconder em tela cheia.
- **Aparência**: tamanho da ilha, distância do topo e reduzir animações.
- **Atalhos**: atalhos globais para mostrar/ocultar a ilha (padrão **Ctrl+Alt+I**), abrir as configurações, mutar o microfone e tocar/pausar a música.
- **Avançado**: recarregar a ilha, abrir a pasta de configurações e restaurar padrões.
- **Módulos**: liga/desliga cada recurso da ilha e suas opções (tempos do timer, som do alarme, passo da rodinha do volume, nome do servidor do Discord, bateria de fones...).

As configurações ficam em `%APPDATA%\tandem-desktop\settings.json`.

## Como funciona

| Arquivo | Papel |
| --- | --- |
| `main.js` | Processo principal do Electron: janela transparente sempre no topo, clique-através, bandeja, menu de contexto, ícones dos apps, esconder em tela cheia e leitura do log do OBS. |
| `media.ps1` | Processo PowerShell que emite uma linha JSON por evento: mídia (WinRT `GlobalSystemMediaTransportControls`), volume, saída de áudio, microfone, câmera e tela cheia. Recebe comandos (`toggle`, `next`, `prev`, `vol 0.5`, `mute`, `micmute`, `output <id>`) pela entrada padrão. |
| `native.cs` | Helpers nativos carregados pelo PowerShell: Core Audio (volume, saídas, microfone e sessões de captura), monitor de atividade de sensores do Media Foundation (câmera) e detecção de tela cheia. |
| `preload.js` | Ponte segura (`contextBridge`) entre o processo principal e a página. |
| `settings.js` | Configurações persistentes com padrões e avisos de mudança. |
| `launcher-main.js`, `launcher/` | O lançador: janela, apps, histórico da área de transferência, ações (processo principal) e a interface com busca, calculadora e emojis. |
| `settings/` | A janela de configurações (página, estilo, lógica e preload próprio). |
| `index.html`, `style.css`, `renderer.js` | A ilha em si: estados, animações, timer, relógio e bateria. |
| `assets/` | Logo original e ícones gerados: `icon.ico`/`icon.png` (app) e `tray-dark.ico`/`tray-light.ico` (bandeja, trocados conforme o tema da barra de tarefas). |
| `scripts/make-icons.ps1` | Gera todos os ícones a partir de `assets/logo.png` (1024×1024, logo branca em fundo transparente). |

Para regerar os ícones depois de trocar a logo:

```bash
powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
```

## Limitações conhecidas

- O nome do servidor do Discord vem do canal que está aberto na janela, que nem sempre é o canal de voz.
- O mudo da ilha é o mudo do microfone no Windows; o mudo interno de apps como o Discord não é detectado.
- Pensado para o monitor principal (inclusive a detecção de tela cheia).
- A bateria só aparece para fones Bluetooth que reportam o nível ao Windows.
- Trocar a saída de áudio usa uma interface não documentada do Windows (`IPolicyConfig`), estável desde o Windows 7.
