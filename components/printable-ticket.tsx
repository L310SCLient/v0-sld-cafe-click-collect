import type { Order } from '@/types'

function shortOrderNumber(id: string): string {
  return `#${(parseInt(id.replace(/-/g, '').slice(0, 8), 16) % 10000)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

interface PrintableTicketProps {
  order: Order
}

export function PrintableTicket({ order }: PrintableTicketProps) {
  return (
    <div
      id="printable-ticket"
      style={{
        display: 'none',
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        fontSize: '12px',
        color: '#000',
        width: '80mm',
        padding: '6mm 4mm',
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px dashed #000', paddingBottom: '4mm' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.1em' }}>SLD CAFÉ</div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>12 rue des Filatiers · 31000 Toulouse</div>
        <div style={{ fontSize: '10px' }}>05 61 23 45 67</div>
      </div>

      {/* Order info */}
      <div style={{ marginBottom: '3mm' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center' }}>
          Commande {shortOrderNumber(order.id)}
        </div>
        <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '1mm' }}>
          {formatDate(order.created_at)}
        </div>
      </div>

      {/* Customer */}
      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3mm 0', marginBottom: '3mm' }}>
        <div>Client : {order.customer_first_name} {order.customer_last_name}</div>
        {order.customer_phone && <div>Tél : {order.customer_phone}</div>}
        <div style={{ fontWeight: 700 }}>Retrait : {order.pickup_time}</div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, paddingBottom: '1mm' }}>Article</th>
            <th style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, paddingBottom: '1mm', width: '30px' }}>Qté</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 600, paddingBottom: '1mm' }}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            // Formule names contain details in parentheses: "La Formule Midi (Poulet, Coca, Tiramisu)"
            const parenIdx = item.name.indexOf(' (')
            const mainName = parenIdx > -1 ? item.name.slice(0, parenIdx) : item.name
            const details = parenIdx > -1 ? item.name.slice(parenIdx + 2, -1).split(', ') : []

            return (
              <tr key={i}>
                <td style={{ paddingTop: '1.5mm', verticalAlign: 'top' }}>
                  <div>{mainName}</div>
                  {details.map((detail, j) => (
                    <div key={j} style={{ fontSize: '10px', paddingLeft: '3mm', color: '#444' }}>
                      └ {detail}
                    </div>
                  ))}
                </td>
                <td style={{ textAlign: 'center', paddingTop: '1.5mm', verticalAlign: 'top' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', paddingTop: '1.5mm', verticalAlign: 'top' }}>{formatPriceCents(item.price * item.quantity)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Total */}
      <div
        style={{
          borderTop: '2px solid #000',
          paddingTop: '2mm',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '16px',
          fontWeight: 700,
        }}
      >
        <span>TOTAL</span>
        <span>{formatPriceCents(order.total_cents)}</span>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '6mm', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '3mm' }}>
        <div>Merci pour votre visite !</div>
        <div style={{ marginTop: '1mm' }}>sldcafe.fr</div>
      </div>
    </div>
  )
}

export function triggerPrint() {
  window.print()
}
