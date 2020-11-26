// Carrega as dependencias necessarias para rodar o servidor, file reader e webSocketServer
const express = require("express");
const app = express();
const fs = require("fs");
const server = require("http").createServer(app);
const WebSocket = require("ws");

// Inicia um servidor do WebSocket
const webSocketServer = new WebSocket.Server({ server: server });

// Mensagem que é mostrada ao entrar no servidor
const welcomeMessage =
  "Bem vindo ao servidor! \n Digite 1 para visualizar os arquivos disponíveis para você escolher";

// Flag para controlar se o cliente quer selecionar um arquivo ou inserir as opções comuns do menu
let isInsertingFileName = false;

// Método que escaneia o diretorio de arquivos e retorna a lista de arquivos existentes
const scanDirectoryFiles = () => {
  return fs.readdirSync("./arquivos").reduce((fileList, currentFile) => {
    fileList.push(currentFile);
    return fileList;
  }, []);
};

// Método que recupera os arquivos disponíveis
const getAvailableFiles = () => {
  let message = "Nenhum arquivo disponível!";
  const files = scanDirectoryFiles();
  if (files.length > 0) {
    message = `Há ${files.length} arquivos disponíveis: `;
    files.forEach((file) => {
      message += "\n" + file;
    });
  }
  isInsertingFileName = true;
  message +=
    "\nInforme o nome do arquivo que deseja receber (com a extensão):\n Caso deseje receber multiplos arquivos, escreva o nome do arquivo com extensão separados por virgula";
  return message;
};

// Switch case que irá receber a ação do usuario e fará a ação correspondente seguindo o fluxo de seleção de opções do menu
const getOptionsModeResult = (option) => {
  switch (Number(option)) {
    case 1:
      return getAvailableFiles();
    default:
      return "Você não selecionou uma opção válida. Tente novamente";
  }
};

// Método que retorna o arquivo em base64
const getBase64File = (filename) => {
  return fs.readFileSync(
    "./arquivos/" + filename.trim(),
    { encoding: "base64" },
    (file) => file
  );
};

// Procura o arquivo digitado pelo usuário e o retorna como base64
const getFileInsertModeResult = (filenames) => {
  const filenameArr = filenames.split(",");
  try {
    const filesArr = filenameArr.reduce((base64Files, currentFilename) => {
      const base64File = getBase64File(currentFilename);
      base64Files.push(base64File);
      return base64Files;
    }, []);
    isInsertingFileName = false;
    return { files: filesArr };
  } catch (exMsg) {
    return { message: "Você não digitou um nome válido, tente novamente!" };
  }
};

// Método que envia mensagem como JSON para o cliente
const sendToClient = (messageToSend, ws) => {
  ws.send(JSON.stringify(messageToSend));
};

// Evento que executa quando um cliente se conecta ao webSocketServer
webSocketServer.on("connection", (ws) => {
  // Envia mensagem de boas vindas
  sendToClient({ message: welcomeMessage }, ws);
  // Evento que executa quando o cliente manda uma mensagem ao servidor
  ws.on("message", (messageReceived) => {
    let result;
    // Se for o modo de inserir arquivos, executa o modo de buscar arquivo digitado
    if (isInsertingFileName) {
      result = getFileInsertModeResult(messageReceived);
      // Se o retornado foi arquivos, deve mostrar a mensagem de boas vindas novamente após 1 segundo
      if (result.files) {
        setTimeout(() => {
          sendToClient({ message: welcomeMessage }, ws);
        }, 1000);
      }
      // Caso contrário ele busca executa o método de opções do menu para retornar o feedback pro usuário
    } else {
      result = { message: getOptionsModeResult(messageReceived) };
    }
    // Envia o resultado dos métodos acima
    sendToClient(result, ws);
  });
});

// Define a porta que o servidor escutará quando for executado
server.listen(6787, () => console.log("Escutando porta 6787"));
