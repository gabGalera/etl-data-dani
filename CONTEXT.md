# Transacoes

Payment events exported by merchants and stored for later loading into this system. A payment can be split into recebiveis, one per parcela.

## Language

**Transacao**:
A single payment attempt or settlement belonging to one cliente.
_Avoid_: Transaction, order, payment, venda

**Cliente**:
The merchant the transacao belongs to.
_Avoid_: Customer, user, account

**Adquirente**:
The payment processor that handled the transacao.
_Avoid_: Gateway, provider

**Data**:
The calendar day on which the transacao happened.
_Avoid_: Data/Hora, timestamp, createdAt

**Hora**:
The time of day on which the transacao happened, kept separate from data.
_Avoid_: Data/Hora, datetime

**Id da transacao**:
The export's identifier for the payment. One transacao has one. A recebivel carries the same identifier, and several recebiveis can share it, one per parcela.
_Avoid_: Id da transacao do adquirente, foreign key

**Id da transacao do adquirente**:
The adquirente's own identifier for the payment. On a transacao it can be missing, and more than one transacao may carry the same value. On a recebivel and on a recebimento it is always present. The same value can appear on more than one recebimento.
_Avoid_: Primary key, unique key, foreign key

**Valor da transacao**:
The gross amount of the transacao.
_Avoid_: Valor liquido, taxa

**Taxa percentual**:
The fee rate charged on the transacao, expressed as a percent.
_Avoid_: Taxa valor

**Taxa valor**:
The fee amount on the transacao. A negative amount is a deduction.
_Avoid_: Taxa percentual

**Valor liquido**:
The amount of the transacao after the fee.
_Avoid_: Valor da transacao, total reembolsado

**Total reembolsado**:
The amount refunded against the transacao. It can be missing.
_Avoid_: Valor liquido, estorno as a status

**Recebivel**:
One parcela of a payment owed to the cliente.
_Avoid_: Transacao, repasse as the whole payment

**Parcela recebivel**:
The installment number of a recebivel, starting at 1.
_Avoid_: Total parcelas

**Total parcelas**:
How many installments the payment was split into.
_Avoid_: Parcela recebivel

**Valor repasse**:
The amount of a recebivel paid to the cliente.
_Avoid_: Valor da transacao, valor liquido

**Data da transacao**:
The calendar day of the payment a recebivel comes from.
_Avoid_: Data, data repasse

**Data repasse**:
The calendar day a recebivel is paid to the cliente.
_Avoid_: Data da transacao, data

**Maquininha**:
One parcela of a payment owed to the cliente when no transacao in this system carries the same id da transacao. Same business fields as a recebivel row, stored in `maquininhas` instead of `recebiveis`. Import from `recebiveis_` files will split rows by that rule in a later change.
_Avoid_: Recebivel, transacao, duplicate recebivel

**Recebimento**:
One confirmed amount from the adquirente, kept as its own line in a single receipt file.
_Avoid_: Recebivel, transacao

**Linha**:
The place of a recebimento in that receipt file. A recebimento is identified by its linha. The header line is not a recebimento.
_Avoid_: Id da transacao do adquirente

**Data recibo**:
The calendar day the adquirente recorded the recebimento.
_Avoid_: Data, data repasse, data da transacao

**Confirmacao**:
The signed amount the adquirente confirmed for that recebimento. A negative confirmacao reverses an earlier amount.
_Avoid_: Valor repasse, valor liquido, valor da transacao

**Erro**:
A recorded rejection of one export file, or of one line in it. It names the file, the line when the failure belongs to a line, and the reason. A later import appends another erro.
_Avoid_: Exception, log
