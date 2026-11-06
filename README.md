# Tandem Desktop

Uma pílula no topo da tela do Windows, inspirada na Dynamic Island, que se expande com animações elásticas para mostrar o que está acontecendo no PC.

## O que ela faz

- **Tocando agora**: capa do álbum e equalizador animado para qualquer app que publique mídia no Windows (Spotify, YouTube no navegador...). Passe o mouse para ver título, artista, barra de progresso e os controles ⏮ ⏯ ⏭.
- **Volume**: aviso com barra sempre que o volume do sistema muda. Com o mouse sobre a ilha, a rodinha do mouse ajusta o volume.
- **Timer**: botões de 1/5/10/25 min na ilha aberta ou pelo clique direito. A contagem aparece ao lado da música, e ao terminar a ilha treme e toca um alarme.
- **Microfone / chamadas**: detecta quais apps estão usando o microfone e mostra o ícone do app com um medidor de voz. Fora da visão de chamada, aparece uma bolinha amarela; com o mic mudo, um microfone vermelho riscado. Clique para mutar/desmutar.
- **Discord**: durante uma chamada, mostra o nome do servidor e do canal (lidos do título da janela do Discord).
- **Bateria**: aviso de "Carregando" ao conectar o carregador; relógio, data e bateria na ilha aberta quando nada está tocando.

Fora da pílula os cliques passam direto para o que está atrás, então ela não atrapalha.

## Requisitos

- Windows 10 ou 11
- [Node.js](https://nodejs.org/) 18+
- Windows PowerShell 5.1 (já vem com o Windows)

## Como rodar

```bash
npm install
npm start
```

Um ícone em forma de pílula aparece na bandeja do sistema com as opções **Iniciar com o Windows**, **Recarregar** e **Sair**.

## Como funciona

| Arquivo | Papel |
| --- | --- |
| `main.js` | Processo principal do Electron: janela transparente sempre no topo, clique-através, bandeja, menu de contexto e ícones dos apps. |
| `media.ps1` | Processo PowerShell que emite uma linha JSON por evento: mídia (WinRT `GlobalSystemMediaTransportControls`), volume e microfone. Recebe comandos (`toggle`, `next`, `prev`, `vol 0.5`, `mute`, `micmute`) pela entrada padrão. |
| `audio.cs` | Helpers de Core Audio carregados pelo PowerShell: volume, mudo e nível do microfone, e sessões de captura ativas. |
| `preload.js` | Ponte segura (`contextBridge`) entre o processo principal e a página. |
| `index.html`, `style.css`, `renderer.js` | A ilha em si: estados, animações, timer, relógio e bateria. |

## Limitações conhecidas

- O nome do servidor do Discord vem do canal que está aberto na janela, que nem sempre é o canal de voz.
- O mudo da ilha é o mudo do microfone no Windows; o mudo interno de apps como o Discord não é detectado.
- Pensado para o monitor principal.
