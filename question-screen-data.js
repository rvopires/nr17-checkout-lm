/**
 * Conteúdo — NR 17 Ergonomia para Operadores de Check Out · Leroy Merlin · padrão TecnoCursos
 * Gerado a partir de "NR 17 - Check Out 46 slide.pdf" e do roteiro do curso (artefato "Roteiro NR 17 Check Out").
 * Somente o que está no material. As dúvidas para o SESMT estão marcadas com "A CONFIRMAR" neste arquivo.
 *
 * Tipos usados: cover | reflect | content | compare | quiz-intro | question | match | sort | fill | finale
 *
 * Fotos: assets/fotos/*.png. Enquanto a foto não existe, a tela mostra um espaço do tamanho certo
 * com o nome do arquivo e o formato. Salve a imagem com esse nome e ela aparece no lugar.
 * Nomes: pM.T.png (M = módulo, T = tela do roteiro; letras a, b, c quando a tela tem várias fotos),
 *        mMpK.png (imagens das perguntas), capamoduloN.png, capa-fundo.png, capa-parabens.png.
 *
 * Desafios (um formato diferente em cada módulo):
 *  M1 Ergonomia em foco        → 3 question (cartões)       · mínimo 2
 *  M2 Monte o posto            → 1 match (6 pares)
 *  M3 Faça ou evite            → 1 sort (8 cartões)
 *  M4 Complete a frase         → 3 fill                     · mínimo 2
 *  M5 Duelo do check out       → 10 question (certo ou errado) · mínimo 8   (A CONFIRMAR: acerto mínimo)
 */
(function () {
  var F = 'assets/fotos/';
  var PANDA = 'https://player-vz-d35edf2a-8e7.tv.pandavideo.com.br/embed/?v=';

  function cover(m, title, subtitle) {
    return { id: 'm' + m + '-cover', type: 'cover', title: 'Módulo ' + m + ' — ' + title, subtitle: subtitle,
      transcript: 'Módulo ' + m + ': ' + title + '.', image: F + 'capamodulo' + m + '.png', imageAlt: 'Capa do Módulo ' + m + ': ' + title };
  }
  function intro(m, title, count, min, icon, body) {
    return { id: 'm' + m + '-quiz-intro', type: 'quiz-intro', title: 'Desafio — ' + title, count: count, minCorrect: min, icon: icon,
      body: body + ' Mínimo de <strong>' + min + (min === 1 ? ' acerto' : ' acertos') + '</strong> para avançar.',
      transcript: 'Desafio do módulo ' + m + ': ' + title + '.' };
  }
  /* vídeo: sem o código do Panda mostra um espaço "Vídeo a gravar"; com o código (7º argumento) toca o vídeo */
  function video(id, title, dur, scene, brief, body, pandaId) {
    var out = { id: id, type: "video", kicker: "🎥 Vídeo", title: title, duration: dur, scene: scene, brief: brief, body: body,
      transcript: "Vídeo: " + title + ". " + body };
    if (pandaId) { out.embed = PANDA + pandaId; out.playerId = "panda-" + pandaId; }
    return out;
  }
  /* item de lista com foto: tone = blue | orange | teal | purple | pink | gold */
  function it(icon, tone, title, text, image, imageAlt, extra) {
    var o = { icon: icon, tone: tone, title: title, text: text };
    if (image) { o.image = F + image + '.png'; o.imageAlt = imageAlt || title; }
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  /* sequência de passos com foto à esquerda (uma foto grande por vez) */
  function passos(id, title, unit, next, ratio, items, transcript) {
    return { id: id, type: 'content', steps: true, stepSkin: 'equip', stepLayout: 'lado', stepRatio: ratio || 1,
      stepUnit: unit, stepNext: next, stepFinish: 'Concluir', kicker: '📄 Texto', title: title,
      items: items.map(function (p) {
        return { image: F + p[0] + '.png', imageAlt: p[1], icon: p[2], title: p[3], text: p[4] };
      }), transcript: transcript };
  }
  /* resumo do módulo: ficha com ícone, título e frase */
  function resumo(m, items, transcript) {
    return { id: 'm' + m + '-resumo', type: 'content', skin: 'ficha', kicker: '✅ Resumo', title: 'Resumo do módulo ' + m,
      items: items.map(function (r) { return { icon: r[0], title: r[1], text: r[2] }; }), transcript: transcript };
  }
  /* pergunta de 3 cartões; ok = posição da resposta certa (0, 1 ou 2) */
  function q(id, mod, k, question, certa, erradas, ok, explanation, review, imageAlt) {
    var alts = erradas.slice(); alts.splice(ok, 0, certa);
    return { id: id, type: 'question', question: question,
      alternatives: alts.map(function (t, i) { return { id: 'abc'.charAt(i), text: t, correct: i === ok }; }),
      explanation: explanation, review: review, transcript: question,
      image: F + 'm' + mod + 'p' + k + '.png', imageAlt: imageAlt, variant: 'cartoes', confirm: true };
  }
  /* duelo: certo ou errado */
  function duelo(id, question, certo, explanation, review, k) {
    return { id: id, type: 'question', question: question, image: F + 'm5d' + k + '.png', imageAlt: review,
      alternatives: [{ id: 'a', text: 'Certo', correct: certo }, { id: 'b', text: 'Errado', correct: !certo }],
      explanation: explanation, review: review, transcript: question, variant: 'confirmar', confirm: true };
  }
  function fill(id, text, extra, review, body) {
    return { id: id, type: 'fill', title: 'Complete a frase', body: body || 'Toque nas palavras de baixo para preencher a lacuna.',
      text: text, extra: extra, review: review, transcript: 'Complete a frase: ' + review + '.' };
  }

  window.QUESTION_SCREEN_SESSION = {
    "meta": { "title": "NR 17 – Ergonomia no check out", "brand": "TecnoCursos", "musicSrc": "musica/musica_foco.mp3" },
    "modules": [

      /* ================= MÓDULO 1 ================= */
      {
        "id": 1, "title": "Ergonomia e postura", "meta": "Texto + fotos · desafio Ergonomia em foco",
        "titleUnlock": { "title": "POSTURA EM FOCO", "body": "Você sabe o que é ergonomia e por que a postura importa no check out.", "icon": "🧍", "itens": ["O que é ergonomia", "As 3 áreas da ergonomia", "Corpo e postura no trabalho"] },
        "screens": [
          cover(1, 'Ergonomia e postura', 'O que é ergonomia, de onde vem a palavra, como o corpo trabalha e quais são as três áreas da ergonomia.'),
          video('m1-v-1', "Abertura: você já pensou na sua postura hoje?", "≈ 45 s",
            "A instrutora no cenário da área de check outs. Corta para uma operadora em postura neutra, o ajuste da cadeira, a fila de check outs e uma pausa com alongamento.",
            "A instrutora fala direto para a câmera nas duas primeiras frases. Depois, cenas reais cinematográficas na loja, com a locução em off.",
            "Olá! Este é o treinamento de NR 17: ergonomia para operadores de check out. Você já pensou na sua postura hoje? O segredo está na postura correta. A ergonomia estuda a interação física entre as pessoas e o seu trabalho, adaptando o trabalho, o equipamento e o ambiente ao trabalhador. Neste treinamento, você vai ver como deve ser o posto de trabalho, o manuseio das mercadorias, a organização do atendimento, os cuidados com a postura e os alongamentos. Vamos começar?", "a8ab1a6c-eb47-4ea8-9d18-96ae6d7ab0c6"),
          {
            "id": "m1-reflexao", "type": "reflect", "title": "Antes de começar",
            "prompt": "Você já pensou na sua postura hoje?", "promptAccent": "Como está o seu corpo agora?",
            "choices": [
              { "icon": "😊", "text": "Sim, já pensei" },
              { "icon": "🤔", "text": "Nem tinha reparado" },
              { "icon": "😬", "text": "Agora que lembrei, estou torto" }
            ],
            "answer": "O segredo está na postura correta.",
            "transcript": "Você já pensou na sua postura hoje? O segredo está na postura correta."
          },
          video('m1-v-2', "A origem da ergonomia e a segurança do trabalho", "≈ 35 s",
            "As palavras ergon e nomos em um cartão, a evolução da ferramenta e o colaborador conferindo o corredor com atenção à segurança.",
            "Cartão em Pixar 3D para a origem da palavra; depois fotos reais cinematográficas. Locução calma e direta.",
            "A palavra ergonomia vem do grego: ergon, que é trabalho, e nomos, que é lei ou regra. Ergonomia quer dizer leis do trabalho. Ela surgiu porque o ser humano sempre quis usar menos esforço físico e mental nas tarefas do dia a dia. A segurança do trabalho cuida da proteção e da integridade da vida do trabalhador, e todas as ações buscam melhorar o ambiente de trabalho e o jeito seguro de fazer cada tarefa.", "ad80ca7d-ec4a-4e8a-aef2-567e370905a1"),
          video('m1-v-3', "A definição da norma e o que a ergonomia traz", "≈ 30 s",
            "Dois colaboradores diferentes, cada um com o posto ajustado, e a operadora tranquila ao fim.",
            "Fotos reais cinematográficas. Locução calma e direta.",
            "A norma define a ergonomia como o campo de conhecimentos que busca adequar equipamentos, ambientes e a organização do trabalho às características e limitações de cada pessoa, considerando idade, sexo e habilidades. O resultado é conforto, comodidade e produtividade.", "db75057b-b37c-4724-900f-4020dbc449cd"),
          {
            "id": "m1-o-que-e", "type": "content", "layout": "duo", "kicker": "📄 Texto", "title": "O que é ergonomia",
            "cards": [
              { "icon": "🤝", "thumbs": [F + 'p1.3a.png'], "lead": "Ergonomia", "title": "Pessoa e trabalho", "body": "Estuda a interação física entre as pessoas e o seu trabalho." },
              { "icon": "🛠️", "thumbs": [F + 'p1.3b.png'], "lead": "Na prática", "title": "Adaptar, não forçar", "body": "Adapta o trabalho, o equipamento e o ambiente ao trabalhador." }
            ],
            "items": [
              { "icon": "🏛️", "title": "Ergos e nomos", "text": "Ergos = trabalho. Nomos = lei, regra. Ergonomia quer dizer “leis do trabalho”." }
            ],
            "transcript": "A ergonomia estuda a interação física entre as pessoas e o seu trabalho, adaptando o trabalho, o equipamento e o ambiente ao trabalhador. Ergos quer dizer trabalho e nomos quer dizer lei ou regra: ergonomia é a lei do trabalho."
          },
          video('m1-v-4', "O corpo no trabalho", "≈ 35 s",
            "O modelo da coluna, o carrinho carregado e o colaborador em postura neutra.",
            "Fotos reais cinematográficas, sem pessoas nas duas primeiras cenas. Locução em off.",
            "O corpo humano é feito de ossos, tendões, músculos e ligamentos. Esse sistema permite movimentos amplos e boa coordenação fina, mas com resistência pequena. Por isso, grandes resistências, como carga e peso, devem ser feitas por máquinas e carrinhos, e não pelo corpo. A biomecânica ocupacional é o estudo das posturas e das tarefas do homem no trabalho.", "5b74b429-1494-4f9e-a924-d873f29e78ea"),
          video('m1-v-5', "As 3 áreas da ergonomia", "≈ 40 s",
            "A operadora em postura neutra (física), a equipe conversando com a liderança (organizacional) e o operador atento à tela (cognitiva).",
            "Fotos reais cinematográficas, uma por área. Locução em off.",
            "A ergonomia tem três áreas. A física trata de anatomia, postura, movimentos repetitivos, manuseio de materiais e LER e DORT, e avalia o posto de trabalho. A organizacional trata de trabalho em grupo, tempo de trabalho, comunicação, projetos participativos e gestão de qualidade. E a cognitiva trata de tomada de decisões, confiabilidade humana, estresse, carga mental e interação com a máquina. Mais do que avaliar, a ergonomia física tem o papel de orientar.", "733997b4-8e08-41f4-aa6c-78f13c2cf024"),
          {
            "id": "m1-areas", "type": "content", "layout": "zonas", "kicker": "📄 Texto", "title": "As 3 áreas da ergonomia",
            "groups": [{ "icon": "🧭", "label": "Onde a ergonomia atua", "items": [
              it('💪', 'blue', 'Física', 'Anatomia, postura, movimentos repetitivos, manuseio de materiais e LER/DORT. Avalia o posto de trabalho.', 'p1.9a', 'Operadora em postura neutra no check out'),
              it('🤝', 'orange', 'Organizacional', 'Trabalho em grupo, tempo de trabalho, comunicação, projetos participativos e gestão de qualidade.', 'p1.9b', 'Equipe de caixa conversando com a liderança'),
              it('🧠', 'purple', 'Cognitiva', 'Tomada de decisões, confiabilidade humana, estresse, carga mental e interação com a máquina.', 'p1.9c', 'Operador atento à tela touch screen')
            ] }],
            "transcript": "As três áreas da ergonomia: a física, que trata de postura, movimentos repetitivos, manuseio de materiais e LER e DORT. A organizacional, que trata de trabalho em grupo, tempo de trabalho, comunicação e gestão de qualidade. E a cognitiva, que trata de decisões, estresse, carga mental e interação com a máquina."
          },
          intro(1, 'Ergonomia em foco', 3, 2, '🧍', '3 perguntas cronometradas sobre ergonomia e postura.'),
          q('m1-q1', 1, 1, 'O que a ergonomia busca?',
            'Adaptar o trabalho, o equipamento e o ambiente ao trabalhador',
            ['Adaptar o trabalhador ao equipamento', 'Aumentar só a velocidade do atendimento'], 1,
            'A ergonomia adapta o trabalho, o equipamento e o ambiente ao trabalhador, e não o contrário.', 'Objetivo da ergonomia',
            'Cena neutra: posto de caixa vazio de uma loja, visto de frente'),
          q('m1-q2', 1, 2, 'Quem deve fazer o transporte de grandes cargas e pesos, segundo o treinamento?',
            'Máquinas e carrinhos', ['O operador de caixa, com muito cuidado', 'Qualquer colega que estiver por perto'], 2,
            'Grandes resistências, como carga e peso, devem ser realizadas por máquinas e carrinhos.', 'Cargas e pesos',
            'Cena neutra: corredor de loja com carrinhos plataforma parados'),
          q('m1-q3', 1, 3, 'O que significa a palavra ergonomia?',
            'Ergos é trabalho e nomos é lei, regra', ['Ergos é máquina e nomos é velocidade', 'Ergos é corpo e nomos é descanso'], 0,
            'Ergos é trabalho e nomos é lei, regra. Ergonomia quer dizer “leis do trabalho”.', 'Origem da palavra',
            'Cena neutra: uma prancheta e livros sobre uma mesa clara')
        ]
      },

      /* ================= MÓDULO 2 ================= */
      {
        "id": 2, "title": "Posto de trabalho e equipamentos", "meta": "Texto + fotos · desafio Monte o posto",
        "titleUnlock": { "title": "POSTO AJUSTADO", "body": "Você sabe como deve ser o posto, a cadeira e os equipamentos do check out.", "icon": "🪑", "itens": ["Medidas do posto", "Cadeira e apoio para os pés", "Equipamentos do check out", "Ambiente e temperatura"] },
        "screens": [
          cover(2, 'Posto de trabalho e equipamentos', 'O que o Anexo I da NR 17 pede para o mobiliário, a cadeira, os equipamentos e o ambiente do check out.'),
          video('m2-v-6', "Medidas do posto e movimentos naturais", "≈ 40 s",
            "O alcance dos braços, o trabalho em pé e sentado e o tronco reto.",
            "Fotos reais cinematográficas, uma por regra, sempre com a postura correta. Locução em off.",
            "O Anexo I da NR 17 traz as regras para o posto de trabalho do check out. O mobiliário atende ao corpo de noventa por cento dos trabalhadores, respeitando os alcances dos braços e da visão. O posto garante o trabalho sentado e em pé, com espaço para você se movimentar e para a cadeira. Os movimentos respeitam os ângulos naturais do corpo, sem flexão e sem torção do tronco.", "61eef59f-f3a7-43f0-8200-30cfaba6e37f"),
          {
            "id": "m2-compare-tronco", "type": "compare", "open": true, "title": "Alcançar o produto: dois jeitos",
            "body": "Toque em cada lado para ver o que muda no corpo.",
            "compare": [
              { "label": "✕ Tronco torcido", "image": F + 'p2.5a.png', "imageAlt": "Operador torcendo o tronco para alcançar um produto longe", "ok": false,
                "text": "Girar e esticar o tronco para alcançar o produto: evite a flexão e a torção do tronco." },
              { "label": "✓ Tronco reto", "image": F + 'p2.5b.png', "imageAlt": "Operador com o tronco reto, produto ao alcance dos braços", "ok": true,
                "text": "Produto ao alcance, tronco reto: o movimento respeita o ângulo natural do corpo." }
            ],
            "transcript": "Alcançar o produto: dois jeitos. Torcer o tronco é o jeito a evitar. Manter o tronco reto, com o produto ao alcance, respeita o ângulo natural do corpo."
          },
          video('m2-v-7', "Cadeira, apoio para os pés, esteira e mobiliário", "≈ 40 s",
            "A cadeira com encosto lombar, o apoio para os pés, a medida de 2,70 m, o telefone e a quina arredondada.",
            "Fotos reais cinematográficas. Locução em off.",
            "A cadeira tem encosto para apoio lombar e é ajustável à sua estatura e à tarefa. O apoio para os pés é independente da cadeira. Check outs de dois metros e setenta ou mais têm esteira eletromecânica. Segundo o material, as lojas hoje não têm esteira, porque têm menos que isso. Também deve haver comunicação com o apoio e a supervisão, e o mobiliário não pode ter quinas vivas nem rebarbas.", "3a5781b1-e27f-4d9c-abc8-1cfccdc3ea24"),
          passos('m2-cadeira', 'Cadeira, apoio, esteira e mobiliário', 'Requisito', 'Próximo requisito', 1, [
            ['p2.6a', 'Cadeira de caixa com encosto lombar e regulagem de altura', '🪑', 'Cadeira de trabalho', 'Assento e encosto para apoio lombar, com estofamento de densidade adequada, ajustáveis à estatura do trabalhador e à tarefa.'],
            ['p2.6b', 'Apoio para os pés no chão, sob o balcão', '🦶', 'Apoio para os pés', 'O apoio para os pés é independente da cadeira.'],
            ['p2.7', 'Bancada de check out com régua de medir ao lado', '📏', 'Esteira a partir de 2,70 m', 'Check outs com 2,70 m ou mais de comprimento devem ter esteira eletromecânica. Segundo o material, as lojas hoje não têm check out com esteira, porque têm menos de 2,70 m.'],
            ['p2.8', 'Quina arredondada do balcão e telefone de chamada', '📞', 'Comunicação e mobiliário seguro', 'Deve haver comunicação com o pessoal de apoio e a supervisão. O mobiliário não tem quinas vivas nem rebarbas, e pregos, rebites e parafusos não podem causar acidentes.']
          ], 'Cadeira, apoio, esteira e mobiliário. A cadeira tem assento e encosto para apoio lombar, ajustável à estatura e à tarefa. O apoio para os pés é independente da cadeira. Check outs de dois metros e setenta ou mais têm esteira eletromecânica. Deve haver comunicação com o apoio e a supervisão, e o mobiliário não tem quinas vivas.'),
          video('m2-v-8', "Equipamentos e ferramentas do check out", "≈ 35 s",
            "O leitor e a tela ao alcance, o posto completo e os cabos protegidos.",
            "Fotos reais cinematográficas dos equipamentos. Locução em off.",
            "Os equipamentos e as ferramentas são escolhidos para favorecer os movimentos da função, sem exigir muita força, pressão, preensão, flexão, extensão ou torção. Ficam dentro do alcance das suas mãos e da sua visão, têm proteção contra acidentes mecânicos ou elétricos e são mantidos em bom funcionamento. No seu check out, você tem a tela touch screen, o leitor de código de barras, o telefone e a campainha, a cadeira com regulagem de altura e encosto e o apoio para os pés.", "7036baac-31d4-4f96-aff0-bf311e5d8c87"),
          {
            "id": "m2-seu-checkout", "type": "content", "layout": "zonas", "kicker": "📄 Texto", "title": "O que tem no seu check out",
            "groups": [{ "icon": "🛒", "label": "Equipamentos do operador de check out", "items": [
              it('🖥️', 'blue', 'Tela touch screen', '', 'p2.10a', 'Tela touch screen do check out'),
              it('📶', 'orange', 'Leitor de código de barras', '', 'p2.10b', 'Leitor de código de barras sobre o balcão'),
              it('📞', 'teal', 'Telefone e campainha', 'Comunicação com o apoio e a supervisão.', 'p2.10c', 'Telefone de chamada e campainha do check out'),
              it('🪑', 'purple', 'Cadeira com regulagem', 'Regulagem de altura e encosto.', 'p2.10d', 'Cadeira de caixa com regulagem de altura'),
              it('🦶', 'pink', 'Apoio para os pés', '', 'p2.10e', 'Apoio para os pés sob o balcão')
            ] }],
            "transcript": "O que tem no seu check out: tela touch screen, leitor de código de barras, telefone e campainha, cadeira com regulagem de altura e encosto, e apoio para os pés."
          },
          video('m2-v-9', "Ambiente, temperatura e ajustes do posto", "≈ 30 s",
            "A luz da entrada com cortina de ar, o ar condicionado fora da linha do sopro e o ajuste do apoio para os pés.",
            "Fotos reais cinematográficas. Locução em off.",
            "O ambiente também importa: iluminação, ruído e conforto térmico seguem a NR 17, e você é protegido de correntes de ar e de reflexos incômodos. O material indica de dezoito a vinte e cinco graus, e o ar condicionado não deve soprar direto em você. O posto também prevê ajustes localizados, exceto nos equipamentos fixos, pensando no seu conforto.", "74aa179d-94ee-42c1-a118-97e4dc1cc31c"),
          intro(2, 'Monte o posto', 1, 1, '🪑', 'Ligue cada item do posto de check out ao que a norma pede.'),
          {
            "id": "m2-match", "type": "match", "title": "Ligue o item do posto ao que a norma pede",
            "body": "Toque em um item e depois no que a norma pede para ele.",
            "leftTitle": "Item do posto", "rightTitle": "O que a norma pede",
            "pairs": [
              { "ex": "Mobiliário do check out", "body": "Atende ao corpo de 90% dos trabalhadores" },
              { "ex": "Cadeira de trabalho", "body": "Encosto para apoio lombar, ajustável à estatura e à tarefa" },
              { "ex": "Apoio para os pés", "body": "Independente da cadeira" },
              { "ex": "Check out com 2,70 m ou mais", "body": "Esteira eletromecânica" },
              { "ex": "Quinas do mobiliário", "body": "Sem quinas vivas e sem rebarbas" },
              { "ex": "Ar condicionado", "body": "Não deve soprar direto no trabalhador" }
            ],
            "review": "Posto de trabalho do check out",
            "transcript": "Ligue cada item do posto de check out ao que a norma pede."
          }
        ]
      },

      /* ================= MÓDULO 3 ================= */
      {
        "id": 3, "title": "Mercadorias e organização do trabalho", "meta": "Texto + fotos · desafio Faça ou evite",
        "titleUnlock": { "title": "TRABALHO ORGANIZADO", "body": "Você sabe como manusear mercadorias e organizar o atendimento sem sobrecarga.", "icon": "🛒", "itens": ["Manuseio de mercadorias", "O ensacamento", "Organização do atendimento", "Saídas do posto"] },
        "screens": [
          cover(3, 'Mercadorias e organização do trabalho', 'Como manusear mercadorias sem sobrecarga, o ensacamento, o fluxo de clientes, as pausas e os direitos do operador.'),
          video('m3-v-10', "Manuseio de mercadorias e carrinhos", "≈ 35 s",
            "O código de barras lido sem levantar o produto, o apoio de um colega e o carrinho homologado com chapas.",
            "Fotos reais cinematográficas. Locução em off.",
            "A loja deve evitar que você use força muscular excessiva ao manusear mercadorias. Para isso, negocia o tamanho e o volume das embalagens com os fornecedores, usa equipamentos adequados, apresenta o código de barras ao leitor de outras formas, tem pessoal auxiliar e adota outras medidas. Quando o volume é grande ou o peso é excessivo, a organização usa mecanismos auxiliares, como carrinhos homologados para transportar chapas de madeira.", "e5e1d84b-e933-4092-9ec6-5e68bfcddeed"),
          video('m3-v-11', "O ensacamento", "≈ 20 s",
            "Os check outs com um ensacador e o cliente ensacando no autoatendimento.",
            "Fotos reais cinematográficas. Locução em off.",
            "O ensacamento também não pode virar parte da sua rotina: a loja mantém no mínimo um ensacador a cada três check outs em funcionamento e facilita o ensacamento pelo cliente, como no caixa de autoatendimento.", "352cbdf7-f2df-44f6-a876-df53e91f2ddf"),
          {
            "id": "m3-ensacamento", "type": "content", "layout": "duo", "kicker": "📄 Texto", "title": "O ensacamento",
            "cards": [
              { "icon": "🛍️", "thumbs": [F + 'p3.4a.png'], "lead": "Mínimo", "title": "1 ensacador a cada 3 check outs", "body": "No mínimo um ensacador a cada três check outs em funcionamento." },
              { "icon": "🧾", "thumbs": [F + 'p3.4b.png'], "lead": "Exemplo", "title": "Autoatendimento", "body": "O self check out facilita o ensacamento pelo próprio cliente." }
            ],
            "items": [
              { "icon": "🚫", "title": "Não é rotina do operador", "text": "O ensacamento não pode virar parte do ciclo normal de trabalho do operador de check out." }
            ],
            "transcript": "O ensacamento não pode virar parte do ciclo normal de trabalho do operador. A loja mantém no mínimo um ensacador a cada três check outs em funcionamento e facilita o ensacamento pelo cliente, como no caixa de autoatendimento."
          },
          video('m3-v-12', "Organização do atendimento", "≈ 35 s",
            "A fila única, o check out preferencial e a pausa na área de apoio.",
            "Fotos reais cinematográficas. Locução em off.",
            "O número de check outs abertos e de operadores deve ser compatível com o fluxo de clientes, respeitando o seu ritmo. Para isso, a loja usa pessoas de apoio ou de substituição, filas únicas por grupos de check outs, check outs especiais para idosos, gestantes, pessoas com deficiência e clientes com poucas mercadorias, pausas durante a jornada e rodízio entre operadores.", "cf3e04af-5e70-4c84-a907-4081770fb87a"),
          video('m3-v-13', "Saídas do posto e o seu crachá", "≈ 25 s",
            "A operadora avisando a líder e se levantando com a coluna reta, e o crachá com o nome escolhido.",
            "Fotos reais cinematográficas. Locução em off.",
            "Você também pode sair do posto a qualquer momento da jornada, avisando, para atender suas necessidades fisiológicas, além do intervalo de refeição previsto na CLT. E todo trabalhador do check out usa um crachá visível, com o nome ou sobrenome que ele mesmo escolhe.", "e10613cf-0015-473f-95e9-27d330ecf354"),
          passos('m3-direitos', 'Saídas do posto e seu crachá', 'Direito', 'Próximo direito', 1.5, [
            ['p3.8', 'Operadora avisando a líder antes de deixar o posto', '🚻', 'Saídas do posto', 'O operador pode sair do posto a qualquer momento da jornada, avisando, para atender suas necessidades fisiológicas. Isso vale além do intervalo de refeição previsto na CLT.'],
            ['p3.9', 'Close de um crachá no colete, com o nome visível', '🪪', 'Seu nome no crachá', 'Todo trabalhador do check out usa um dispositivo de identificação visível, com nome e/ou sobrenome escolhido por ele mesmo.']
          ], 'Saídas do posto e seu crachá. O operador pode sair do posto a qualquer momento da jornada, avisando, para atender suas necessidades fisiológicas. E todo trabalhador do check out usa um crachá visível, com o nome ou sobrenome que ele mesmo escolhe.'),
          intro(3, 'Faça ou evite', 1, 1, '🛒', 'Classifique cada atitude: é o que se deve fazer ou o que se deve evitar no check out.'),
          {
            "id": "m3-sort", "type": "sort", "title": "Faça ou evite?", "body": "Um cartão por vez: escolha o grupo certo.",
            "leftLabel": "Faça", "rightLabel": "Evite",
            "items": [
              { "text": "Usar carrinho homologado para chapas de madeira pesadas", "side": "left", "why": "mecanismos auxiliares são adotados para o peso excessivo" },
              { "text": "Levantar sozinho uma chapa de madeira muito pesada", "side": "right", "why": "o peso excessivo pede mecanismos auxiliares" },
              { "text": "Manter um ensacador a cada três check outs em funcionamento", "side": "left", "why": "esse é o mínimo previsto" },
              { "text": "Deixar o ensacamento virar parte da rotina do operador de caixa", "side": "right", "why": "o ensacamento não pode virar parte do ciclo normal de trabalho" },
              { "text": "Avisar a liderança e sair do posto para ir ao banheiro", "side": "left", "why": "as saídas são garantidas a qualquer momento, mediante comunicação" },
              { "text": "Esperar o horário de refeição para atender necessidades fisiológicas", "side": "right", "why": "a saída é garantida a qualquer momento da jornada" },
              { "text": "Usar o crachá com o nome que você escolheu", "side": "left", "why": "o dispositivo de identificação traz o nome escolhido pelo trabalhador" },
              { "text": "Manter um número de check outs abertos incompatível com o fluxo de clientes", "side": "right", "why": "o número de check outs deve ser compatível com o fluxo de clientes" }
            ],
            "review": "Mercadorias e organização do trabalho",
            "transcript": "Classifique cada atitude entre o que se deve fazer e o que se deve evitar no check out."
          }
        ]
      },

      /* ================= MÓDULO 4 ================= */
      {
        "id": 4, "title": "Postura, LER/DORT e ginástica laboral", "meta": "Texto + fotos · desafio Complete a frase",
        "titleUnlock": { "title": "CORPO EM EQUILÍBRIO", "body": "Você sabe prevenir dores, manter a postura neutra e fazer os alongamentos.", "icon": "🤸", "itens": ["Postura parada e touch screen", "LER/DORT e punhos retos", "Mãos, braços, cabeça e ombros", "Na cadeira e em pé", "Digitação com punhos retos"] },
        "screens": [
          cover(4, 'Postura, LER/DORT e ginástica laboral', 'Os riscos da postura parada e do esforço repetitivo, a postura neutra e os alongamentos que você faz na cadeira e em pé.'),
          video('m4-v-14', "Postura parada e o touch screen", "≈ 1 min",
            "A postura parada, a alternância entre ficar em pé e sentado, o braço elevado no touch screen e a troca de braço.",
            "Fotos reais cinematográficas, uma cena por movimento citado. Locução em off.",
            "Além de ajustar o posto, é preciso cuidar da postura. Pela ISO 11226, postura estática é a que fica mantida por mais de quatro segundos. E variar a postura direto, em pé, sentado e caminhando, por mais de duas horas seguidas já gera risco. Ao digitar nas telas touch screen do atendimento, vale a regra de vinte por cento de contração e oitenta por cento de recuperação. Por exemplo: se você eleva o braço por dois minutos, precisa de oito minutos de recuperação, e deve alternar os braços.", "fdd6456d-6efc-4708-891c-4610f3817b4a"),
          {
            "id": "m4-compare-braco", "type": "compare", "open": true, "title": "Braço elevado no touch screen",
            "body": "Toque em cada lado para ver o exemplo do material.",
            "compare": [
              { "label": "✕ Sem recuperar", "image": F + 'p4.3a.png', "imageAlt": "Operadora com o mesmo braço elevado no touch screen por muito tempo", "ok": false,
                "text": "Manter o mesmo braço elevado direto, sem tempo de recuperação, sobrecarrega o ombro." },
              { "label": "✓ 2 min e 8 min de recuperação", "image": F + 'p4.3b.png', "imageAlt": "Operadora trocando o braço que usa no touch screen", "ok": true,
                "text": "Elevar o braço por 2 minutos pede 8 minutos de recuperação. Faça a alteração dos braços." }
            ],
            "transcript": "Braço elevado no touch screen. Elevar o braço por dois minutos pede oito minutos de recuperação. Faça a alteração dos braços."
          },
          video('m4-v-15', "Efeitos da má postura e a postura neutra", "≈ 25 s",
            "Quatro ícones das regiões do corpo e a operadora vista de costas em postura neutra.",
            "Um cartão de ícones em Pixar 3D e uma foto real, sem mostrar dor. Locução em off.",
            "A má postura pode causar dor no pescoço, nas costas, nos braços, nos antebraços e nas mãos, além de cansaço, desconforto e outros problemas, como LER e DORT. Por isso, mantenha-se sempre na postura neutra.", "c2786f65-821d-444f-a4f3-ddc6ae85908b"),
          video('m4-v-16', "LER/DORT e os punhos no balcão de apoio", "≈ 30 s",
            "Os quatro fatores de risco em ícones e as mãos digitando com os punhos retos.",
            "Um cartão de ícones em Pixar 3D e uma foto real. Locução em off.",
            "LER é a lesão por esforço repetitivo e DORT é a doença osteomuscular relacionada ao trabalho. A ergonomia ajuda a reduzir o alto índice de afastamento e cuida da saúde do trabalhador. A prevenção começa pelos fatores de risco: movimentos repetitivos, movimentos bruscos, uso de força e posições forçadas ou por tempo prolongado. No balcão da liderança de caixa e no balcão de apoio do autoatendimento, que têm mouse e teclado, evite dobrar os punhos.", "1f15c212-0bb1-4507-aec4-cb0075c73ceb"),
          {
            "id": "m4-compare-punhos", "type": "compare", "open": true, "title": "Mouse e teclado no balcão de apoio",
            "body": "O balcão da liderança de caixa e o balcão do self check out têm digitação. Toque em cada lado.",
            "compare": [
              { "label": "✕ Punhos dobrados", "image": F + 'p4.6a.png', "imageAlt": "Mãos com os punhos dobrados para cima sobre o teclado", "ok": false,
                "text": "A posição de flexão dos punhos ao usar mouse e teclado deve ser evitada." },
              { "label": "✓ Punhos retos", "image": F + 'p4.6b.png', "imageAlt": "Mãos com os punhos retos sobre o teclado, com apoio de punho", "ok": true,
                "text": "Mantenha os punhos retos, alinhados com os antebraços, ao digitar." }
            ],
            "transcript": "Mouse e teclado no balcão de apoio. A posição de flexão dos punhos deve ser evitada. Mantenha os punhos retos ao digitar."
          },
          video('m4-v-17', "Alongamento: mãos, antebraços e braços", "≈ 1 min 20 s",
            "Cada movimento citado na locução aparece em uma cena: fechar e abrir a mão, girar o punho, dedos entrelaçados, antebraço, cotovelo atrás da cabeça, braços atrás do corpo e braços para cima.",
            "Uma cena real para cada movimento, na área de apoio ao lado dos check outs, feito devagar e dentro do limite do corpo. Locução em off.",
            "Ficar sentado por muito tempo causa tensão no pescoço e nos ombros e dor na região lombar. Faça os alongamentos várias vezes ao dia ou sempre que se sentir cansado. Comece pelas mãos: feche firmemente a mão e abra, esticando os dedos. Gire o punho nos dois sentidos, com os dedos relaxados. Entrelace os dedos e faça movimentos de onda, e gire os polegares. Repita três vezes cada movimento. Para o antebraço, estique o braço com a palma para fora, como um sinal de pare, e puxe a mão com a outra em direção ao corpo, por vinte segundos. Leve o cotovelo atrás da cabeça e conduza com a outra mão, por vinte segundos. Entrelace os dedos atrás do corpo e depois para cima, por vinte segundos, três vezes.", "931a3d04-203e-49e4-9c2b-b0a4a5982821"),
          passos('m4-maos-bracos', 'Alongamento: mãos, antebraços e braços', 'Exercício', 'Próximo exercício', 1, [
            ['p4.8a', 'Mãos fechando firme e abrindo com os dedos esticados', '✊', 'Fechar e abrir a mão', 'Feche firmemente a mão e abra, esticando os dedos — ×3'],
            ['p4.8b', 'Punho girando devagar com os dedos relaxados', '🔃', 'Girar o punho', 'Gire o punho no sentido horário e no anti-horário, com os dedos relaxados — ×3'],
            ['p4.8c', 'Dedos entrelaçados fazendo movimento de onda', '🙌', 'Dedos entrelaçados', 'Entrelace os dedos e faça movimentos de onda. Depois gire os polegares nos dois sentidos — ×3'],
            ['p4.9a', 'Braço esticado à frente com a palma para fora, puxada pela outra mão', '🖐️', 'Antebraço', 'Estique o braço na altura abaixo do ombro, palma para fora (sinal de “pare”), e puxe a mão com a outra em direção ao corpo — 20 s, ×3 (cada lado)'],
            ['p4.9b', 'Cotovelo atrás da cabeça, conduzido pela mão oposta', '💪', 'Cotovelo atrás da cabeça', 'Leve o cotovelo atrás da cabeça, em direção ao ombro oposto, e conduza para baixo com a outra mão — 20 s, ×3 (cada braço)'],
            ['p4.9c', 'Braços atrás do corpo, dedos entrelaçados, afastados do corpo', '🤸', 'Braços atrás do corpo', 'Com os braços atrás, entrelace os dedos e afaste os braços do corpo, dentro do seu limite — 20 s, ×3'],
            ['p4.9d', 'Braços esticados para cima com os dedos entrelaçados', '🙆', 'Braços para cima', 'Estique os braços para cima, com os dedos entrelaçados e as palmas para o alto — 20 s']
          ], 'Alongamento das mãos, antebraços e braços. Feche firmemente a mão e abra, esticando os dedos. Gire o punho nos dois sentidos. Entrelace os dedos, faça movimentos de onda e gire os polegares. Estique o braço com a palma para fora e puxe a mão com a outra, por vinte segundos, três vezes de cada lado. Leve o cotovelo atrás da cabeça e conduza com a outra mão. Entrelace os dedos atrás do corpo e depois para cima, por vinte segundos.'),
          video('m4-v-18', "Alongamento: cabeça, pescoço e ombros", "≈ 50 s",
            "O sim e não com a cabeça, a inclinação lateral com a mão, os ombros subindo até as orelhas, o giro dos ombros e a caminhada para beber água.",
            "Uma cena real para cada movimento, na área de apoio ao lado dos check outs, feito devagar. Locução em off.",
            "Agora, a cabeça e o pescoço. Faça o sinal de sim e de não com a cabeça, devagar, com os ombros relaxados. Evite mover a cabeça para trás, porque isso pode comprimir os nervos. Incline a cabeça para o lado com a ajuda da mão, por vinte segundos, três vezes de cada lado. Para os ombros, inspire elevando os ombros até as orelhas e solte ao expirar, três vezes. Depois, gire os ombros para a frente e para trás, três vezes em cada sentido. E nas pausas, levante, caminhe e beba uma água.", "39ff4da5-db5c-4806-a3dc-04989ddc8e2f"),
          passos('m4-pescoco', 'Alongamento: cabeça, pescoço e ombros', 'Exercício', 'Próximo exercício', 1, [
            ['p4.10a', 'Cabeça fazendo o sinal de sim e de não, devagar', '🙂', 'Sim e não', 'Faça o sinal de “sim” e de “não” com a cabeça, devagar, com os ombros relaxados. Evite mover a cabeça para trás, porque pode comprimir os nervos — ×3'],
            ['p4.10b', 'Cabeça inclinada para o lado com a ajuda da mão', '↔️', 'Inclinar a cabeça', 'Incline a cabeça para o lado com a ajuda da mão do mesmo lado — 20 s, ×3 (cada lado)'],
            ['p4.10c', 'Ombros subindo até as orelhas e soltando', '🔺', 'Ombros para cima', 'Inspire elevando os ombros como se fosse encostá-los nas orelhas e solte ao expirar — ×3'],
            ['p4.10d', 'Ombros girando para a frente e para trás', '🔁', 'Girar os ombros', 'Faça movimentos rotatórios dos ombros, da frente para trás e de trás para a frente — ×3 (cada sentido)']
          ], 'Alongamento da cabeça, pescoço e ombros. Faça o sinal de sim e de não com a cabeça, devagar, sem mover a cabeça para trás. Incline a cabeça para o lado com a ajuda da mão, por vinte segundos. Suba os ombros até as orelhas e solte, e depois gire os ombros nos dois sentidos.'),
          video('m4-v-19', "Alongamentos na cadeira", "≈ 50 s",
            "Uma cena para cada movimento feito sentado: braços à frente, braços para cima, um braço sobe e o outro desce, giro do tronco, peito aberto com ombros para trás e sacudir as mãos.",
            "Uma imagem em estilo infográfico para cada movimento, em verde da Leroy, com a locução em off.",
            "Agora, sentado, entrelace os dedos e estique os braços à frente, por dez a vinte segundos, duas vezes. Depois, estique os braços para cima, por dez a quinze segundos. Levante um braço e abaixe o outro, por oito a dez segundos de cada lado. Gire o tronco com suavidade, por oito a dez segundos para cada lado. Apoie as costas no encosto, abra o peito e leve os ombros para trás, por dez a quinze segundos. Para terminar, sacuda as mãos por oito a dez segundos.", "d00374f4-e164-471d-a895-6809fa6b41ec"),
          passos('m4-cadeira', 'Alongamentos na cadeira', 'Exercício', 'Próximo exercício', 1, [
            ['p4.11a', 'Dedos entrelaçados e braços esticados à frente, sentado', '🤝', 'Braços à frente', 'Entrelace os dedos e estique os braços à frente, por 10 a 20 segundos — 20 s, ×2'],
            ['p4.11b', 'Braços esticados para cima, sentado', '🙆', 'Braços para cima', 'Estique os braços para cima, por 10 a 15 segundos — 15 s'],
            ['p4.11c', 'Um braço levantado e o outro abaixado, sentado', '↕️', 'Um braço sobe, o outro desce', 'Levante um braço e abaixe o outro, por 8 a 10 segundos de cada lado — 10 s, ×2 (cada lado)'],
            ['p4.11d', 'Tronco girando suavemente para o lado, sentado', '🔄', 'Girar o tronco', 'Gire o tronco com suavidade, por 8 a 10 segundos para cada lado — 10 s, ×2 (cada lado)'],
            ['p4.11e', 'Costas apoiadas no encosto, peito aberto e ombros para trás', '🫁', 'Abrir o peito', 'Apoie as costas no encosto, abra o peito e leve os ombros para trás, por 10 a 15 segundos — 15 s'],
            ['p4.11f', 'Mãos sacudindo soltas, sentado', '👋', 'Sacudir as mãos', 'Para terminar, sacuda as mãos, por 8 a 10 segundos — 10 s']
          ], 'Alongamentos na cadeira. Entrelace os dedos e estique os braços à frente, depois para cima. Levante um braço e abaixe o outro. Gire o tronco com suavidade. Apoie as costas, abra o peito e leve os ombros para trás. Para terminar, sacuda as mãos.'),
          video('m4-v-20', "Alongamentos em pé", "≈ 30 s",
            "Uma cena para cada movimento feito em pé: braço do relógio para trás das costas com a cabeça inclinada, palmas das mãos unidas na frente do peito e dorso das mãos unidos com os dedos para baixo.",
            "Uma animação ou imagem para cada movimento, em verde da Leroy, com a locução em off.",
            "Agora, em pé. Leve o braço do relógio para trás das costas e incline a cabeça para o lado oposto, por dez a doze segundos. Troque de lado. Una as palmas das mãos na frente do peito e abaixe-as devagar, mantendo por dez segundos. Depois, una o dorso das mãos, com os dedos para baixo, e mantenha por dez segundos.", "5f637b63-e5f4-4fff-8a17-fd92f3576c54"),
          passos('m4-em-pe', 'Alongamentos em pé', 'Exercício', 'Próximo exercício', 1, [
            ['p4.12a', 'Braço do relógio atrás das costas e cabeça inclinada para o lado oposto', '🕐', 'Braço atrás das costas', 'Leve o braço do relógio para trás das costas e incline a cabeça para o lado oposto, por 10 a 12 segundos. Troque de lado — 12 s, ×2 (cada lado)'],
            ['p4.12b', 'Palmas das mãos unidas na frente do peito, descendo devagar', '🙏', 'Palmas unidas', 'Una as palmas das mãos na frente do peito e abaixe-as devagar, mantendo por 10 segundos — 10 s'],
            ['p4.12c', 'Dorso das mãos unidos, com os dedos para baixo', '🤲', 'Dorso das mãos unido', 'Una o dorso das mãos, com os dedos para baixo, e mantenha por 10 segundos — 10 s']
          ], 'Alongamentos em pé. Leve o braço do relógio para trás das costas e incline a cabeça para o lado oposto, depois troque de lado. Una as palmas das mãos na frente do peito e abaixe-as devagar. Depois, una o dorso das mãos, com os dedos para baixo.'),
          video('m4-v-21', "Digitação: punhos retos no teclado e no mouse", "≈ 35 s",
            "O balcão de apoio com mouse e teclado: o jeito errado, com o punho dobrado, e o jeito certo, com os dedos alinhados ao antebraço e o apoio de punho.",
            "Uma imagem em estilo infográfico para o errado e uma para o certo, em verde da Leroy, com a locução em off.",
            "No balcão de apoio, com mouse e teclado, o punho precisa ficar reto, alinhado com o antebraço. Errado é dobrar o punho para cima, para baixo ou para os lados, ou digitar com as mãos tortas em relação ao antebraço. Certo é manter os dedos alinhados com o antebraço, usar um apoio de punho de espuma à frente do teclado e do mouse e deixar os antebraços na horizontal.", "787298d8-9629-42d5-85c7-cd28e8c375d8"),
          passos('m4-digitacao', 'Digitação: punhos retos', 'Passo', 'Próximo passo', 1, [
            ['p4.13a', 'Mãos digitando com o punho dobrado para cima, para baixo ou para o lado', '🙅', 'Evite dobrar o punho', 'Dobrar o punho para cima, para baixo ou para os lados, ou digitar com as mãos tortas em relação ao antebraço, sobrecarrega o punho.'],
            ['p4.13b', 'Mãos digitando com os dedos alinhados ao antebraço, antebraços na horizontal', '✅', 'Punho reto', 'Mantenha os dedos alinhados com o antebraço e deixe os antebraços na horizontal.'],
            ['p4.13c', 'Apoio de punho de espuma na frente do teclado e do mouse', '🧽', 'Apoio de punho', 'Use um apoio de punho de espuma à frente do teclado e do mouse.']
          ], 'Digitação com os punhos retos. Evite dobrar o punho para cima, para baixo ou para os lados. Mantenha os dedos alinhados com o antebraço e os antebraços na horizontal. Use um apoio de punho de espuma à frente do teclado e do mouse.'),
          intro(4, 'Complete a frase', 3, 2, '🤸', 'Complete cada frase com a palavra certa sobre postura e alongamento.'),
          fill('m4-fill-1', 'No touch screen, a regra é {{20%}} de contração e {{80%}} de recuperação.', ['50%', '10%'], 'Contração e recuperação', 'Toque nas palavras de baixo para preencher as lacunas, na ordem.'),
          fill('m4-fill-2', 'No balcão de apoio, a flexão dos {{punhos}} ao usar mouse e teclado deve ser evitada.', ['joelhos', 'tornozelos'], 'Digitação no balcão'),
          fill('m4-fill-3', 'Nos exercícios de pescoço, evite mover a cabeça para {{trás}}.', ['frente', 'o lado'], 'Cuidado no pescoço')
        ]
      },

      /* ================= MÓDULO 5 ================= */
      {
        "id": 5, "title": "Revisão e duelo", "meta": "Revisão + desafio Duelo do check out",
        "titleUnlock": { "title": "CHECK OUT ERGONÔMICO", "body": "Você concluiu o treinamento de ergonomia no check out.", "icon": "🏆", "itens": ["Revisão dos 4 módulos", "Duelo do check out", "Treinamento concluído"] },
        "screens": [
          cover(5, 'Revisão e duelo', 'Revisão dos quatro módulos e um duelo de certo ou errado para fechar o treinamento.'),
          intro(5, 'Duelo do check out', 10, 8, '⚔️', 'Responda certo ou errado a cada afirmação sobre o check out e a ergonomia.'),
          duelo('m5-d1', 'A cadeira do check out precisa de apoio para os pés independente dela.', true, 'O apoio para os pés é independente da cadeira.', 'Apoio para os pés', 1),
          duelo('m5-d2', 'O mobiliário do check out deve atender às medidas de apenas 50% dos trabalhadores.', false, 'A norma pede o corpo de 90% dos trabalhadores.', 'Medidas do mobiliário', 2),
          duelo('m5-d3', 'Flexão e torção do tronco devem ser incentivadas para alcançar o produto.', false, 'A norma pede o contrário: respeitar os ângulos e as trajetórias naturais, evitando flexão e torção do tronco.', 'Tronco reto', 3),
          duelo('m5-d4', 'Check outs com 2,70 m ou mais devem ter esteira eletromecânica.', true, 'A esteira é exigida a partir de 2,70 m de comprimento.', 'Esteira eletromecânica', 4),
          duelo('m5-d5', 'O mínimo é um ensacador a cada três check outs em funcionamento.', true, 'Esse é o mínimo previsto no item 4.3.', 'Ensacador', 5),
          duelo('m5-d6', 'O operador só pode sair do posto no horário de refeição.', false, 'As saídas são garantidas a qualquer momento da jornada, mediante comunicação.', 'Saída do posto', 6),
          duelo('m5-d7', 'A postura neutra ajuda a prevenir dores e LER/DORT.', true, 'Manter a postura neutra é a melhor forma de prevenir.', 'Postura neutra', 7),
          duelo('m5-d8', 'O crachá do operador deve trazer o nome escolhido por ele mesmo.', true, 'O dispositivo de identificação traz nome e/ou sobrenome escolhido pelo trabalhador.', 'Crachá', 8),
          duelo('m5-d9', 'O ar condicionado pode soprar direto no operador.', false, 'A saída do ar não deve incidir direto sobre o trabalhador.', 'Ar condicionado', 9),
          duelo('m5-d10', 'Cargas muito pesadas devem ser levantadas pelo operador sem ajuda.', false, 'Grandes pesos pedem máquinas, carrinhos ou mecanismos auxiliares.', 'Cargas pesadas', 10),
          video('m5-v-19', "Encerramento", "≈ 30 s",
            "A instrutora no cenário do início, com a mensagem final; corta para a operadora de postura correta, sorrindo.",
            "A instrutora fala direto para a câmera. Uma cena real curta ao final.",
            "Você concluiu o treinamento de NR 17: ergonomia para operadores de check out. Lembre-se: a postura neutra, o posto ajustado e os alongamentos protegem o seu corpo todos os dias. Pense na sua postura todos os dias.", "b8c5b898-de12-4aa6-9924-24bdefd7214e"),
          {
            "id": "m5-finale", "type": "finale", "kicker": "🏆 Conclusão", "eyebrow": "Certificado de conclusão", "title": "Parabéns",
            "image": F + 'capa-parabens.png', "imageAlt": "Capa de parabéns — conclusão do treinamento",
            "body": "Você concluiu o treinamento NR 17 – Ergonomia no check out.",
            "quote": "Pense na sua postura todos os dias.",
            "chips": ["NR 17", "Check out", "TecnoCursos"],
            "transcript": "Parabéns. Você finalizou o NR 17, Ergonomia no check out."
          }
        ]
      }
    ]
  };
})();
