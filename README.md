# RecorteAP

Um plugin Adobe CEP para Photoshop projetado para agilizar o fluxo de trabalho de limpeza de imagens (como Webtoons/Mangás) usando IAs externas (celular, web, etc).

## 🚀 Funcionalidades

- **Letreiro Automático:** Cria seleções de largura total rapidamente (cor rosa no painel).
- **Sync from Photoshop:** Recorta a área selecionada, salva como JPG em uma pasta escolhida e memoriza as coordenadas exatas.
- **Histórico Inteligente:** Acompanha os recortes exportados que estão aguardando edição.
- **Apply to Layer:** Reinsere a imagem editada exatamente na mesma posição e tamanho original.
- **Ajuste de Saturação:** Recupera automaticamente as cores perdidas durante o processamento por IAs externas no momento da reinserção.

## 🛠️ Instalação

1. Clone ou baixe este repositório.
2. Baixe o arquivo oficial `CSInterface.js` da Adobe e coloque-o dentro da pasta `js/`.
3. Mova a pasta `RecorteAP` para o diretório de extensões do CEP:
   - **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
   - **Mac:** `/Library/Application Support/Adobe/CEP/extensions/`
4. Habilite o modo de desenvolvedor (`PlayerDebugMode`) no seu sistema operacional para permitir extensões não assinadas.

## 📖 Como Usar

1. Abra o Photoshop e vá em **Janela > Extensões > RecorteAP**.
2. Clique em **Selecionar Pasta de Destino** e escolha onde os recortes serão salvos.
3. Faça uma seleção na imagem (ou use o botão de Letreiro Largura Total) e clique em **Sync from Photoshop**.
4. Edite a imagem exportada no seu celular ou IA preferida (mantenha o mesmo nome de arquivo).
5. Devolva a imagem para a pasta, clique em **Atualizar** no painel e depois em **Apply to Layer**.

---
*Design minimalista e focado na usabilidade, pensado para não cansar a vista durante longas jornadas de edição.*
# RecorteAP
