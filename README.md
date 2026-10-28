**RecorteAP** é uma extensão para Adobe Photoshop que facilita a exportação e a reaplicação de áreas de uma página. Foi criada para fluxos de edição em que recortes são tratados fora do Photoshop e depois precisam voltar à posição original.

O painel registra as coordenadas de cada seleção, exporta o recorte e permite reaplicá-lo à página, ajustando suas dimensões quando a imagem editada retorna com outro tamanho.

Desenvolvido em Angola.

## Funcionalidades

- **Captura de seleções:** exporta a área selecionada como JPG e registra suas coordenadas e dimensões.
- **Vários recortes:** permite capturar e acompanhar diferentes áreas pelo histórico do painel.
- **Reaplicação dos recortes:** aplica os arquivos editados à página correspondente, ajustando tamanho e posição conforme as coordenadas registradas.
- **Aplicação em lote:** processa os recortes pendentes e permite interromper o processo após o recorte em andamento.
- **Gerenciamento de cor:** oferece conversão para o perfil da página e ajuste opcional para aproximar brilho e cores da referência original.
- **Histórico e arquivos:** permite verificar arquivos, importar recortes da pasta, salvar coordenadas e limpar itens do histórico.

## Requisitos

- Windows e Adobe Photoshop com suporte a extensões CEP.
- O manifesto da versão 1.2.6 declara suporte ao Photoshop a partir da versão **20.0**.
- Um documento aberto no Photoshop e uma pasta de trabalho para os recortes.

## Instalação no Windows

1. Baixe o pacote de instalação na seção **Releases** deste repositório.
2. Extraia o arquivo ZIP.
3. Mantenha a pasta `RecorteAP` e os arquivos do instalador juntos.
4. Execute **`Instalar.cmd`** e siga as instruções exibidas.
5. Reinicie o Photoshop e abra **Janela > Extensões > RecorteAP**.

> O pacote de instalação pode habilitar o `PlayerDebugMode`, necessário para carregar a extensão CEP. Consulte o arquivo `LEIA-ME.txt` incluído no pacote para mais detalhes.

## Como usar

### 1. Capture os recortes

1. Abra a página no Photoshop.
2. No painel do RecorteAP, clique em **Selecionar pasta** e escolha onde salvar os arquivos.
3. Faça uma seleção retangular na área desejada. O botão **Ativar letreiro retangular** ajuda a selecionar a ferramenta.
4. Clique em **Capturar recorte**.
5. Repita o processo para as demais áreas que deseja editar.

### 2. Edite os arquivos

Abra os JPGs gerados no editor de sua preferência. Ao salvar os resultados, mantenha os nomes dos arquivos e coloque-os na pasta de recortes para que o painel possa encontrá-los.

### 3. Aplique os recortes editados

1. Abra no Photoshop as páginas correspondentes aos recortes.
2. No painel, clique em **Verificar arquivos**.
3. Se necessário, ajuste as opções de perfil, brilho e cores.
4. Clique em **Aplicar todos os pendentes**.

O RecorteAP identifica a página de origem e usa as coordenadas registradas para posicionar cada recorte. Se a página tiver sido redimensionada após a captura, pode ser necessário capturar a área novamente.

## Organização do histórico

O painel oferece opções para salvar coordenadas, importar recortes e remover itens já aplicados. A opção **Excluir todos e arquivos** também remove os arquivos associados: use-a somente quando não precisar mais deles.

## Problemas de instalação

Se o painel não aparecer no Photoshop:

- Confirme que os arquivos foram extraídos antes de executar o instalador.
- Feche e abra o Photoshop novamente.
- Verifique as instruções do `LEIA-ME.txt` fornecido com o pacote.
- Confira se sua versão do Photoshop aceita extensões CEP.
