# Eclipse — Ecos do último sol

Um pequeno RPG 2D de batalha por turnos, em português, feito com HTML, CSS e JavaScript puro. Inclui três heróis, nove Addictions, um chefe com intenção de ataque visível, efeitos sonoros opcionais e arte vetorial original. Não usa serviços externos nem precisa de chaves, downloads de assets ou dependências de produção.

## Iniciar

É necessário Python 3 para o servidor local. Na pasta do projeto:

```sh
python3 -m http.server 8000
```

Abra `http://localhost:8000` no navegador. Também é possível usar `npm start` se Node.js e Python estiverem instalados. Pare o servidor com `Ctrl+C`.

Use um servidor HTTP: abrir o HTML diretamente com `file://` não carrega os módulos JavaScript em navegadores que restringem módulos locais. O projeto também pode ser hospedado em qualquer servidor estático, sem etapa de build.

## Como jogar

- Fro’hu, Heifer e Goffen agem nessa ordem; depois Vesper age. Heróis caídos são pulados.
- Escolha uma das três **Addictions** do personagem ativo. Na sequência de ritmo, aperte **Espaço**, **Z** ou toque/clique em **□** quando o quadrado em movimento coincidir com o quadrado fixo. Enter também funciona.
- Cada etapa aceita uma tentativa. Pressionar cedo demais ou deixar o tempo acabar é um erro. Segurar a tecla não repete acertos.
- Perfeito, bom e erro alteram a potência da habilidade. Todas as etapas erradas ainda produzem 45% da potência; uma sequência perfeita produz 130%.
- Cada herói começa com 3 de energia, recupera 1 por rodada e pode armazenar até 5. A primeira Addiction é gratuita; as demais custam 2 e 3.
- **Defender** recupera 2 de energia e reduz em 60% o próximo ataque recebido. O efeito permanece até o herói receber um golpe. Escudos absorvem o dano restante e persistem até se esgotarem.
- A cada terceira rodada, Vesper carrega **Eclipse Total** em vez de atacar. No turno seguinte, acerta todo o grupo. A intenção exibida permite preparar defesa, cura ou escudos.
- Vença reduzindo o HP do chefe a zero. A derrota ocorre se os três heróis caírem. Ambas as telas permitem reiniciar.
- O botão **?** abre o guia. **♪** ativa/desativa áudio sintetizado, desligado por padrão.

## Heróis e Addictions

| Herói | Addiction | Ritmo | Efeito |
|---|---|---|---|
| Fro’hu | Corte da Aurora | 2 etapas | Dano, sem custo |
| Fro’hu | Ruptura Astral | 3 etapas | Dano e exposição: +35% na próxima ofensiva |
| Fro’hu | Nove Sóis | 4 etapas | Dano elevado, ritmo progressivamente mais rápido |
| Heifer | Agulhas da Lua | 3 etapas | Dano, sem custo |
| Heifer | Maré de Vida | 2 etapas | Cura o aliado vivo com menor proporção de HP |
| Heifer | Véu das Estrelas | 3 etapas | Escudos para todos os aliados vivos |
| Goffen | Punho de Pedra | 1 etapa | Golpe pesado, sem custo |
| Goffen | Fome de Brasa | 2 etapas | Dano e cura pessoal de 65% do dano causado |
| Goffen | Coração de Ferro | 3 etapas | Dano e escudo pessoal |

## Organização

```text
index.html            Estrutura da interface e guia
styles.css            Cenário, interface responsiva e animações
js/engine.js          Regras, habilidades, estados e turnos (sem DOM)
js/game.js            Interface, áudio e minijogo de precisão
js/art.js             Sprites SVG originais
tests/engine.test.js Testes das regras de batalha
tests/browser.cjs    Teste funcional opcional com Playwright
```

## Testes

Com Node.js 18 ou superior, sem instalar pacotes:

```sh
npm test
```

São 12 testes cobrindo nove habilidades, precisão, custos, exposição, defesa, escudos, cura, personagens caídos, ataques do chefe, vitória, derrota e reinício. Um deles simula uma partida completa vencível com ataques gratuitos e acertos bons.

O teste de navegador é opcional e requer **Playwright** disponível no ambiente e **Chromium**. Com o servidor rodando na porta 8000:

```sh
node tests/browser.cjs
```

O executável padrão é `/usr/bin/chromium`. Personalize com `CHROMIUM_PATH`; personalize o endereço com `GAME_URL`. O teste usa o relógio virtual do Playwright, executa as nove habilidades pela interface, vence uma partida, provoca derrota, reinicia e verifica ajuda, ausência de erros JavaScript, layout móvel e toque. Capturas são gravadas em `/tmp/eclipse-*.png`. Os testes de navegador foram executados no Chromium; outros navegadores modernos não foram verificados nesta entrega.

## Escopo desta versão

Uma batalha completa e reiniciável, sem exploração de mapa, inventário ou salvamento. Os ritmos são inspirados em comandos de precisão de JRPGs; personagens, nomes de habilidades, arte e implementação foram criados para este projeto. O nome **Addiction** segue o pedido original.
