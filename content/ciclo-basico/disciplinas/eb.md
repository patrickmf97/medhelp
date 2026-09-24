# MEDHELP · Epidemiologia e Bioestatística

Lote 3 · 24/09/2026 · Aulas introdutórias originais, pendentes de revisão técnica. Todos os números dos exercícios são fictícios.

## EB-01-A1 · Contar casos exige definir a população

**Objetivo:** diferenciar prevalência, incidência acumulada e taxa de incidência.

Prevalência considera casos existentes em uma população e momento ou período definidos. Incidência acumulada considera novos casos entre pessoas inicialmente sob risco durante um intervalo. Taxa de incidência usa tempo de observação sob risco no denominador. Essas medidas não são intercambiáveis.

Uma prevalência elevada pode refletir maior ocorrência de novos casos, maior duração da condição ou outros movimentos populacionais. Portanto, ela não é uma medida direta da velocidade de surgimento de casos. Antes de calcular, defina caso, população, tempo e critérios de inclusão.

**Exercício original:** em uma população fechada de 1.000 pessoas, 100 já têm uma condição no início. Entre as 900 restantes, surgem 45 casos em um ano, sem perdas. Calcule prevalência inicial e incidência acumulada.

**Comentário:** prevalência inicial = 100/1.000 = 10%. Incidência acumulada = 45/900 = 5% em um ano. Usar 1.000 no segundo denominador incluiria pessoas que já eram casos.

**Síntese:** o denominador precisa corresponder à pergunta.

**Próximas aulas:** pessoa-tempo, mortalidade, padronização e dinâmica populacional.

**Referência:** CDC, [medidas de frequência](https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson3/section2.html), material conceitual arquivado.

## EB-02-A1 · O desenho determina o que se pode estimar

**Objetivo:** distinguir coorte, caso-controle, transversal e experimento.

Em uma coorte, grupos podem ser acompanhados para observar ocorrência de desfechos. Em caso-controle, a seleção parte do desfecho e compara exposições anteriores. Em estudos transversais, exposição e desfecho são avaliados em um recorte, frequentemente com limitações para estabelecer sua ordem temporal. Ensaios alocam uma intervenção; randomização é um recurso específico de alguns ensaios.

Associação não prova causalidade. Confundimento ocorre quando outra variável distorce a relação estudada; seleção e mensuração também podem introduzir vieses. Uma amostra enorme pode reduzir imprecisão sem corrigir um erro sistemático.

**Exercício original:** selecionar pessoas com e sem uma doença e investigar exposições passadas corresponde a qual desenho? É possível calcular diretamente o risco da doença usando a proporção de casos escolhida pelo pesquisador?

**Comentário:** caso-controle. Em geral, não: a proporção de casos foi definida pela seleção, não pela ocorrência natural na população.

**Síntese:** leia primeiro como os participantes entraram no estudo.

**Próximas aulas:** confundimento, seleção, mensuração e inferência causal.

**Referência:** CDC, [epidemiologia analítica](https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson1/section7.html), material conceitual arquivado.

## EB-03-A1 · Efeito relativo e diferença absoluta

**Objetivo:** calcular e interpretar razão e diferença de riscos.

Razão de riscos compara riscos por divisão. Diferença de riscos compara por subtração. A primeira expressa uma relação multiplicativa; a segunda informa mudança absoluta. Uma mesma razão pode corresponder a diferenças absolutas muito distintas conforme o risco inicial.

Odds é a razão entre probabilidade de ocorrência e de não ocorrência; odds ratio não é automaticamente risco relativo. Linguagem precisa evita apresentar aumento de pontos percentuais como aumento percentual relativo. Uma associação observada também precisa de contexto e avaliação de vieses antes de interpretação causal.

**Exercício original:** em uma coorte fictícia, há 40 casos entre 200 expostos e 20 entre 200 não expostos. Calcule razão e diferença de riscos.

**Comentário:** riscos de 20% e 10%; razão = 2; diferença = 10 pontos percentuais. O aumento relativo é 100%, diferente do aumento absoluto de 10 pontos.

**Síntese:** apresentar medidas absolutas e relativas evita interpretações incompletas.

**Próximas aulas:** odds ratio, medidas de impacto e números necessários para tratar em contextos apropriados.

**Referência:** CDC, [medidas de associação](https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson3/section5.html), material conceitual arquivado.

## EB-04-A1 · Interpretar um teste pela tabela completa

**Objetivo:** diferenciar sensibilidade, especificidade e valor preditivo positivo.

Sensibilidade é a proporção de positivos entre pessoas com a condição; especificidade é a proporção de negativos entre pessoas sem a condição. Valor preditivo positivo é a proporção de pessoas com a condição entre os resultados positivos. Os denominadores são diferentes. A interpretação depende também da população, do padrão de referência e do contexto de uso.

**Exercício original:** um teste é aplicado a 1.000 pessoas, das quais 100 têm a condição. Com sensibilidade de 90% e especificidade de 90%, complete a tabela e calcule o valor preditivo positivo.

| Resultado | Com a condição | Sem a condição | Total |
| --- | ---: | ---: | ---: |
| Positivo | 90 | 90 | 180 |
| Negativo | 10 | 810 | 820 |
| Total | 100 | 900 | 1.000 |

**Comentário:** VPP = 90/180 = 50%. O fato de sensibilidade e especificidade serem 90% não faz o VPP ser 90%. Os 90 falsos positivos vêm de 10% das 900 pessoas sem a condição.

**Síntese:** resultado positivo modifica a avaliação; não é sinônimo automático de diagnóstico confirmado.

**Próximas aulas:** razões de verossimilhança, probabilidade pré-teste e curvas ROC.

**Referências:** MedlinePlus, [interpretação de exames](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/); CDC, [interpretação de testes e prevalência](https://www.cdc.gov/flu/hcp/testing-methods/clinician_guidance_ridt.html). O exercício é genérico e não representa desempenho de um teste de influenza.

## EB-05-A1 · Estimativa, incerteza e valor de p

**Objetivo:** evitar interpretações incorretas de significância estatística.

Uma estimativa amostral varia entre amostras. Intervalos de confiança expressam incerteza segundo um procedimento e suas hipóteses; sua largura depende de informações como tamanho amostral e variabilidade. Um intervalo frequencista de 95% não atribui diretamente 95% de probabilidade ao parâmetro fixo após observar os dados.

O valor de p quantifica quão incompatíveis os dados, ou resultados mais extremos segundo a estatística escolhida, são com um modelo que inclui a hipótese nula. Não é a probabilidade de a hipótese ser verdadeira nem mede o tamanho ou a importância do efeito. Um limiar isolado não substitui avaliação de desenho, magnitude e incerteza.

**Exercício original:** um estudo encontra p = 0,03. É correto afirmar “há 97% de chance de o tratamento funcionar”?

**Comentário:** não. Essa probabilidade não é calculada pelo valor de p. É necessário examinar estimativa do efeito, intervalo, desfecho e qualidade do estudo.

**Síntese:** evidência estatística e relevância prática precisam ser avaliadas juntas.

**Próximas aulas:** distribuições, estimação, erros, poder e comparações múltiplas.

**Referência:** American Statistical Association, [declaração sobre valores de p](https://magazine.amstat.org/blog/2016/03/07/pvalue-mar16/).

## EB-06-A1 · Ler além da conclusão do artigo

**Objetivo:** estruturar uma avaliação crítica de um resultado.

Comece pela pergunta, população, intervenção ou exposição, comparação e desfecho. Depois examine seleção, alocação, mensuração, perdas e análise. Em um ensaio, saber que houve randomização não elimina todos os riscos de viés: desvios da intervenção, dados ausentes e seleção do resultado relatado também importam.

Um estudo pode ter boa validade interna e aplicação limitada a outra população. Desfechos substitutos não são sempre equivalentes a resultados importantes para as pessoas. A conclusão deve acompanhar a estimativa e seus limites, sem transformar uma associação exploratória em recomendação definitiva.

**Exercício original:** dois grupos foram randomizados, mas o desfecho está ausente principalmente entre participantes com pior evolução de um deles. A randomização resolve esse problema?

**Comentário:** não. Dados ausentes relacionados ao resultado podem introduzir viés depois da alocação. É necessário investigar o mecanismo das perdas e a análise empregada.

**Síntese:** qualidade é avaliação de etapas, não um selo derivado do nome do desenho.

**Próximas aulas:** revisões sistemáticas, heterogeneidade, certeza da evidência e aplicabilidade.

**Referência:** Cochrane, [risco de viés em ensaios randomizados](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-08).
