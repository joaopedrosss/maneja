# SPEC-008 · Persistir em PostgreSQL

Responsável: Kauê · Revisor: José Felix · Gantt: 2, 9 · Camada DDD: generic

## Contexto
O `RepositorioMemoria` perde tudo ao reiniciar. Esta spec cria um repositório PostgreSQL com a mesma interface, para o deploy (Servidor de Banco do Diagrama de Implantação).

## Arquivos
- CRIAR `backend/maneja/repositorio_pg.py`, `backend/db/schema.sql`
- ALTERAR `backend/maneja/config.py` (`DATABASE_URL`; sem ela, memória)
- CRIAR `backend/features/persistencia.feature`, `backend/tests/test_persistencia.py`

## Requisitos
- **R1.** Tabelas `piquete`, `lotacao`, `leitura_ndvi`, `movimentacao`, `coleira`, `posicao`, `grupo_externo`. A geometria fica em `jsonb`.
- **R2.** Movimentação aceita: a atualização da lotação e do histórico acontece numa transação. A soma do rebanho se conserva (critério 2.2.1).
- **R3.** Sem banco vazio na demonstração: com `MANEJA_SEMEAR=1`, carrega a fazenda de demonstração se a tabela `piquete` estiver vazia.
- **R4.** Os testes rodam contra `DATABASE_URL_TESTE` ou, sem ela, contra um PostgreSQL embutido (`pgserver`, dependência só de desenvolvimento). Não é preciso instalar banco.

## Cenários (BDD)
```gherkin
Funcionalidade: Persistência

  Cenário: Dados sobrevivem a reinício
    Dado o sistema com PostgreSQL
    E uma movimentação aceita
    Quando o sistema reinicia
    Então o histórico ainda tem a movimentação

  Cenário: Rebanho se conserva
    Dado o sistema com PostgreSQL
    Quando aceito uma movimentação
    Então a soma do rebanho é igual à de antes
```

## Fora do escopo
Migrações versionadas e multi-fazenda.

## Como ficou
- **`maneja/repositorio_pg.py`:** herda de `RepositorioMemoria`. Na subida, carrega tudo para a memória. Depois de cada operação que muda dados, `Sistema.persistir()` chama `salvar()`, que regrava o estado numa única transação. As posições das coleiras são só acrescentadas.
- **O que também é gravado:** o piquete físico de cada coleira (o estado do simulador) e o deslocamento do relógio do simulador. Assim, o "campo" sobrevive a um reinício.
- **`db/schema.sql`:** é idempotente e roda a cada subida.

## Situação
Feita em 19/11 (Kauê): 5 cenários em `backend/features/persistencia.feature`, 37 no total.
