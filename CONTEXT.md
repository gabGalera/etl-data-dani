# Transacoes

Payment events exported by merchants and stored for later loading into this system.

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

**Id da transacao do adquirente**:
The adquirente's own identifier for the transacao. It can be missing, and more than one transacao may carry the same value.
_Avoid_: Primary key, unique key

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

**Erro**:
A recorded rejection of one export file. It names the file, the line when the failure belongs to a line, and the reason. A later import appends another erro.
_Avoid_: Exception, log
