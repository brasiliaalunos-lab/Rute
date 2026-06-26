//  CONFIGURAÇÃO E INTEGRAÇÃO COM FIREBASE (APP + AUTH + FIRESTORE)

// Firebase removido — fluxo local (sem autenticação remota)


// (Sem configuração remota) O quiz funciona localmente e salva no localStorage.

// Nome do usuário (declarado aqui para evitar uso antes da inicialização)
let nomeUsuario = "";


// --- BOTÃO DE LOGOUT (SÓ FUNCIONA SE O BOTÃO EXISTIR NA PÁGINA) ---
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        try { localStorage.removeItem('quiz_nome'); } catch (e) { /* ignore */ }
        alert("Você saiu!");
        reiniciarQuiz();
    });
}


// CONTROLE SIMPLES DE ROTAS (login.html / index.html)

// Descobre o arquivo atual (ex: "index.html", "login.html")
const paginaAtual = window.location.pathname.split("/").pop() || "quiz.html";

// Detectores de página mais robustos (suporta file:// e caminhos diferentes)
const hrefLower = window.location.href.toLowerCase();
const isQuizPage = paginaAtual === "quiz.html" || hrefLower.includes("quiz.html");

// Se estivermos na página do quiz, tentamos recuperar o nome salvo anteriormente
if (isQuizPage) {
    const nomeSalvo = localStorage.getItem('quiz_nome');
    if (nomeSalvo && nomeSalvo.trim()) {
        nomeUsuario = nomeSalvo;
        // Preenche o campo de entrada com o nome salvo (se existir)
        const nomeInputEl = document.getElementById('entrada-nome');
        if (nomeInputEl) nomeInputEl.value = nomeSalvo;
    }
}

// Observação: o fluxo agora permite entrar apenas com nome sem exigir
// autenticação. Não redirecionamos mais automaticamente com base
// no estado do Firebase Auth.


//  FUNÇÕES DE AUTENTICAÇÃO (CADASTRO / LOGIN)
//  USADAS NA PÁGINA login.html

// Funções de autenticação removidas — fluxo local simplificado.


//  ARRAY DE PERGUNTAS DO QUIZ (VERSÃO CORRIGIDA)
const perguntas = [
    { pergunta: "quantos 'Vs' existem no big data? ", opcoes: ["3 = velocidade, violinho, velhas", "5 = velocidade, volume, variedade, veracidade e valor", "6 = volume, verbos, valores, verdades, variedade e velocidades", "1 = valor"], resposta: "5 = velocidade, volume, variedade, veracidade e valor" },
    { pergunta: "em qual dia e mês as torres gêmeas foram atingidas?", opcoes: ["2 de março", "30 de abril","9 de agosto", "11 de setembro"], resposta: "11 de setembro" },
    { pergunta: "em qual america o Brasil está localizado?", opcoes: ["America do Sul", "America Central", "America do Norte", "America estadual"], resposta: "America do Sul" },
    { pergunta: "qual acidente causou a morte de Oliver Tree?", opcoes: ["parada cardíaca", "perdido em uma ilha", "dois helicopteros colidiram", "10 facadas no estômago"], resposta: "dois helicopteros colidiram" },
    { pergunta: "qual a capital do Japão?", opcoes: ["Tokyo", "Yokohama", "Kyoto","Osaka"], resposta: "Tokyo" },
    { pergunta: "como se chama o fenômeno em que a água se congela? ", opcoes: ["evaporação", "solidificação", "gasoso", "gelo"], resposta: "solidificação" },
    { pergunta: "as cores primárias são:", opcoes: ["vermelho, azul e verde", "vermelho, azul e amarelo", "vermelho, verde e azul", "amarelo, azul e roxo"], resposta: "vermelho, azul e amarelo" },
    { pergunta: "qual o maior planeta do sistema solar?", opcoes: ["Júpiter", "Saturno", "Urano", "Netuno"], resposta: "Júpiter" },
    { pergunta: "quem descobriu o Brasil?", opcoes: ["Pedro Álvares Cabral", "Cristovão Colombo", "Vasco da Gama", "Fernando de Magalhães"], resposta: "Pedro Álvares Cabral" },
    { pergunta: "qual o maior oceano do mundo?", opcoes: ["Oceano Atlântico", "Oceano Índico", "Oceano Pacífico", "Oceano Ártico"], resposta: "Oceano Pacífico" }

];
    

//  VARIÁVEIS GLOBAIS DO QUIZ + ÁUDIOS + HISTÓRICO
let indiceAtual = 0;
let acertos = 0;
let erros = 0;
let respostasDadas = [];
let historicoRespostas = [];

// Referências de áudio (na página quiz.html podem existir ou não)
const somAcertou = document.getElementById('som-acertou');
const somErrou = document.getElementById('som-errou');
const somSucesso = document.getElementById('som-sucesso');
const somDerrota = document.getElementById('som-derrota');

function tocarSom(elementoAudio, duracao = 2) {
    if (!elementoAudio) return;
    elementoAudio.currentTime = 0;
    elementoAudio.play();
    setTimeout(() => elementoAudio.pause(), duracao * 1000);
}

function atualizarBarraProgresso() {
    const porcentagem = (indiceAtual / perguntas.length) * 100;
    const barra = document.getElementById('barra-progresso');
    if (barra) barra.style.width = `${porcentagem}%`;
}

function iniciarQuiz() {
    const nomeInput = document.getElementById('entrada-nome');
    const errorMessage = document.getElementById('mensagem-erro');
    const nomeDigitado = nomeInput ? nomeInput.value.trim() : '';

    if (!nomeDigitado) {
        if (errorMessage) {
            errorMessage.textContent = 'Por favor, digite um nome para começar!';
            errorMessage.classList.remove('oculto');
        }
        if (nomeInput) nomeInput.classList.add('entrada-erro');
        return;
    }

    nomeUsuario = nomeDigitado;
    try { localStorage.setItem('quiz_nome', nomeUsuario); } catch (e) { /* ignore */ }

    acertos = 0;
    erros = 0;
    indiceAtual = 0;
    respostasDadas = new Array(perguntas.length).fill(false);
    historicoRespostas = [];

    const containerInicio = document.getElementById('container-inicio');
    const resultado = document.getElementById('resultado');
    const quiz = document.getElementById('quiz');
    const quizPrincipal = document.getElementById('quiz-principal');

    if (containerInicio) containerInicio.classList.add('oculto');
    if (resultado) resultado.classList.add('oculto');
    if (quiz) quiz.classList.remove('oculto');
    if (quizPrincipal) quizPrincipal.classList.remove('oculto');

    const barra = document.getElementById('barra-progresso');
    if (barra) barra.style.width = '0%';

    carregarPergunta();
}

// Carrega a pergunta atual na tela
function carregarPergunta() {
    atualizarBarraProgresso();

    const botaoVoltar = document.getElementById('botao-voltar');
    const proximoBtn = document.getElementById('botao-proximo');
    const feedbackMessage = document.getElementById('mensagem-feedback');
    const perguntaEl = document.getElementById("pergunta");
    const opcoesContainer = document.getElementById("opcoes");

    if (!perguntaEl || !opcoesContainer || !proximoBtn) return;

    // Mostra ou esconde o botão voltar
    if (botaoVoltar) {
        botaoVoltar.style.display = indiceAtual === 0 ? 'none' : 'inline-block';
    }

    // Configura botão "Verificar"
    proximoBtn.textContent = 'Verificar';
    proximoBtn.onclick = verificarResposta;

    // Limpa feedback
    if (feedbackMessage) {
        feedbackMessage.innerHTML = "";
        feedbackMessage.className = '';
    }

    const perguntaAtual = perguntas[indiceAtual];
    perguntaEl.textContent = perguntaAtual.pergunta;

    opcoesContainer.innerHTML = "";
    opcoesContainer.classList.remove("opcoes-desabilitadas");

    // Cria botões de opção
    perguntaAtual.opcoes.forEach(opcaoTexto => {
        const botao = document.createElement("button");
        botao.textContent = opcaoTexto;
        botao.classList.add("opcao");

        botao.onclick = () => {
            const todosBotoes = document.querySelectorAll(".opcao");
            todosBotoes.forEach(b => b.classList.remove("selecionada"));
            botao.classList.add("selecionada");
        };

        opcoesContainer.appendChild(botao);
    });
}

// Verifica a resposta selecionada
function verificarResposta() {
    const respostaSelecionadaEl = document.querySelector(".opcao.selecionada");
    const opcoesContainer = document.getElementById("opcoes");
    const feedbackMessage = document.getElementById('mensagem-feedback');

    if (!respostaSelecionadaEl) {
        alert("Por favor, selecione uma resposta.");
        return;
    }

    if (opcoesContainer) {
        opcoesContainer.classList.add("opcoes-desabilitadas");
    }

    const respostaDoUsuario = respostaSelecionadaEl.textContent;
    const perguntaAtual = perguntas[indiceAtual];

    if (!feedbackMessage) return;

    if (!respostasDadas[indiceAtual]) {
        const correta = (respostaDoUsuario === perguntaAtual.resposta);

        if (correta) {
            acertos++;
            feedbackMessage.textContent = "Resposta Correta!";
            feedbackMessage.className = 'feedback-correto';
            respostaSelecionadaEl.style.backgroundColor = "#2ecc71";
            tocarSom(somAcertou);
        } else {
            erros++;
            feedbackMessage.innerHTML = `Incorreto. A resposta certa é: <strong>${perguntaAtual.resposta}</strong>`;
            feedbackMessage.className = 'feedback-incorreto';
            respostaSelecionadaEl.style.backgroundColor = "#e74c3c";
            tocarSom(somErrou);

            const opcoes = document.querySelectorAll(".opcao");
            opcoes.forEach(opcao => {
                if (opcao.textContent === perguntaAtual.resposta) {
                    opcao.style.backgroundColor = "#2ecc71";
                }
            });
        }

        // Salva essa resposta no histórico
        historicoRespostas.push({
            indicePergunta: indiceAtual,
            pergunta: perguntaAtual.pergunta,
            respostaUsuario: respostaDoUsuario,
            respostaCorreta: perguntaAtual.resposta,
            correta: correta
        });

        respostasDadas[indiceAtual] = true;
    } else {
        feedbackMessage.textContent = "Você já respondeu esta pergunta.";
        feedbackMessage.className = '';
    }

    const proximoBtn = document.getElementById('botao-proximo');
    if (proximoBtn) {
        proximoBtn.textContent = (indiceAtual === perguntas.length - 1) ? 'Finalizar' : 'Próxima';
        proximoBtn.onclick = proximaPergunta;
    }
}

// Volta uma pergunta
function perguntaAnterior() {
    if (indiceAtual > 0) {
        indiceAtual--;
        carregarPergunta();
    }
}

// Vai para próxima pergunta ou mostra resultado
function proximaPergunta() {
    indiceAtual++;
    if (indiceAtual < perguntas.length) {
        carregarPergunta();
    } else {
        mostrarResultado();
    }
}

//  SALVAR RESULTADO E HISTÓRICO NO FIRESTORE

async function salvarResultadoNoFirebase() {
    // Salva resultados localmente no localStorage (substitui Firestore)
    try {
        const chave = 'quiz_historico';
        const existente = JSON.parse(localStorage.getItem(chave) || '[]');
        existente.push({
            nomeUsuario: nomeUsuario || 'Sem nome',
            acertos: acertos,
            erros: erros,
            totalPerguntas: perguntas.length,
            respostas: historicoRespostas,
            criadoEm: new Date().toISOString()
        });
        localStorage.setItem(chave, JSON.stringify(existente));
        console.log('Resultado do quiz salvo localmente.');
    } catch (e) {
        console.error('Erro ao salvar resultado localmente:', e);
    }
}

// Mostra a tela de resultado
function mostrarResultado() {
    const quiz = document.getElementById("quiz");
    const resultado = document.getElementById("resultado");
    const barra = document.getElementById("barra-progresso");
    const mensagem = document.getElementById("mensagem");
    const contadorAcertos = document.getElementById("contador-acertos");
    const contadorErros = document.getElementById("contador-erros");

    if (quiz) quiz.classList.add("oculto");
    if (resultado) resultado.classList.remove("oculto");
    if (barra) barra.style.width = "100%";

    if (mensagem) {
        mensagem.innerHTML = `
            <h2>Resultado Final, <strong>${nomeUsuario}</strong>!</h2>
            <p>Você completou o quiz de tecnologia!</p>
        `;
    }

    if (contadorAcertos) contadorAcertos.textContent = acertos;
    if (contadorErros) contadorErros.textContent = erros;

    tocarSom(somSucesso, 60);

    // Salva resultado no Firestore
    salvarResultadoNoFirebase();
}

// Reinicia o quiz e volta para tela inicial
function reiniciarQuiz() {
    if (somAcertou) somAcertou.pause();
    if (somErrou) somErrou.pause();
    if (somSucesso) somSucesso.pause();
    if (somDerrota) somDerrota.pause?.();

    const quizPrincipal = document.getElementById("quiz-principal");
    const containerInicio = document.getElementById("container-inicio");
    const nomeInput = document.getElementById("entrada-nome");
    const errorMessage = document.getElementById("mensagem-erro");
    const barra = document.getElementById("barra-progresso");

    if (quizPrincipal) quizPrincipal.classList.add("oculto");
    if (containerInicio) containerInicio.classList.remove("oculto");
    if (nomeInput) nomeInput.value = "";
    if (errorMessage) errorMessage.classList.add("oculto");
    if (nomeInput) nomeInput.classList.remove("entrada-erro");
    if (barra) barra.style.width = "0%";
}


// EXPONDO ALGUMAS FUNÇÕES NO ESCOPO GLOBAL
// (para funcionar com onclick="" no HTML)

window.iniciarQuiz = iniciarQuiz;
window.perguntaAnterior = perguntaAnterior;
window.reiniciarQuiz = reiniciarQuiz;

// Quando o módulo carregar, liga os botões da página
document.addEventListener('DOMContentLoaded', () => {
    const btnComecar = document.getElementById('btn-comecar');
    const nomeInput = document.getElementById('entrada-nome');

    if (btnComecar) btnComecar.addEventListener('click', iniciarQuiz);
    if (nomeInput) nomeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') iniciarQuiz(); });
});
