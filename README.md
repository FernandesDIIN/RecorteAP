# RecorteAP ✂️ Feito em Angola.

Um plugin Adobe CEP nativo para Photoshop. Ideal para quem utiliza editores que sofre com o realinhamento de imagens.

## 🚀 O Problema que Resolvemos
Tirar um recorte do Photoshop, e depois tentar encaixar essa imagem editada de volta no documento original (muitas vezes com a resolução alterada) é um processo lento e impreciso. O **RecorteAP** automatiza a extração e a reinserção milimétrica.

## ✨ Funcionalidades

- **Extração Rápida (Sync):** Recorta a área selecionada, salva como JPG em uma pasta escolhida e memoriza as coordenadas e proporções originais no histórico.
- **Letreiro de Largura Total:** Ferramenta dedicada para selecionar a página de ponta a ponta horizontalmente em um clique.
- **Trabalho em Lote:** Fatie múltiplos balões e cenas sequencialmente (os arquivos são salvos como `1 Img.jpg`, `2 Img.jpg`, etc.).
- **Reinserção Cirúrgica (Apply to Layer):** Reinsere a imagem editada exatamente na mesma coordenada. Se a IA externa redimensionou a sua imagem (upscaling), o plugin calcula a diferença e "esmaga" a imagem de volta para o tamanho e posição originais automaticamente.
- **Recuperação de Cor (Saturação):** O plugin aplica um ajuste de Saturação nativo do Photoshop no momento da colagem para restaurar a vivacidade se necessario.
- **Limpeza Total:** Com um clique, apague o histórico do painel e exclua os JPGs residuais do seu HD para iniciar o próximo capítulo com a pasta limpa.

## 🛠️ Instalação (Windows)

A forma mais fácil de instalar é usando o nosso instalador automático:

1. Baixe os arquivos do repositório (Download ZIP) e extraia no seu computador.
2. Dê um clique duplo no arquivo **`install.bat`**.
3. Ele copiará os arquivos para a pasta correta e liberará o registro da Adobe para extensões (`PlayerDebugMode`) automaticamente.
4. Abra o Photoshop.

*(Para instalar no Mac: Copie a pasta `RecorteAP` para `/Library/Application Support/Adobe/CEP/extensions/` e ative o PlayerDebugMode via Terminal).*

## 📖 Como Usar no Dia a Dia

1. Vá em **Janela > Extensões > RecorteAP**.
2. Clique em **Selecionar Pasta de Destino** e escolha sua pasta de trabalho (ex: `C:\Webtoons\Recortes`).
3. Faça uma seleção no seu mangá e clique em **Sync from Photoshop**.
4. Edite a imagem gerada no seu celular ou na sua IA preferida (Atenção: **não altere o nome do arquivo**).
5. Salve a imagem editada na mesma pasta.
6. No painel do Photoshop, clique em **Atualizar** para a luz do arquivo ficar Verde.
7. Escolha a saturação desejada (+1, +2) e clique em **Apply to Layer**. 

Pronto! A imagem será colada e realinhada instantaneamente.

---
*Construído com foco em usabilidade para longas jornadas de edição.*