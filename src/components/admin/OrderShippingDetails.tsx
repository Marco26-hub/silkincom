type ShippingAddress = {
  full_name?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
};

export function OrderShippingDetails({
  address,
  customerEmail,
}: {
  address: ShippingAddress | null;
  customerEmail: string;
}) {
  const fields = [
    ['Destinatario', address?.full_name],
    ['Indirizzo', address?.street_address],
    ['CAP', address?.postal_code],
    ['Città', address?.city],
    ['Paese', address?.country],
    ['Telefono', address?.phone],
    ['Email', customerEmail],
  ];

  return (
    <section className="border border-pearl-grey bg-white p-6">
      <h2 className="font-medium mb-3 text-sm">Dati di spedizione</h2>
      <dl className="space-y-3 text-sm break-words">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-soft-grey mb-1">{label}</dt>
            <dd className="whitespace-pre-line">{value?.trim() || 'Non fornito'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
