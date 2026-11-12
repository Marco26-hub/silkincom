import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingAddressSchema, checkoutContactSchema } from '../../../src/lib/checkout-validation.ts';

const address = {
  full_name: 'Mario Rossi',
  street_address: 'Via Roma 1',
  city: 'Como',
  postal_code: '22100',
  country: 'IT',
  phone: '+39 333 000 0000',
};

test('shipping details cannot be omitted, empty, null or whitespace-only', () => {
  for (const field of Object.keys(address)) {
    for (const value of [undefined, null, '', '   ', '\t\n']) {
      const result = shippingAddressSchema.safeParse({ ...address, [field]: value });
      assert.equal(result.success, false, `${field}: ${JSON.stringify(value)}`);
    }
  }
  assert.equal(shippingAddressSchema.safeParse(undefined).success, false);
  assert.equal(shippingAddressSchema.safeParse(null).success, false);
});

test('valid addresses are normalized without losing international postal codes or phone formatting', () => {
  assert.deepEqual(shippingAddressSchema.parse({
    ...address, street_address: '  Via Roma 1  ', phone: '  +39 333 000 0000  ', country: ' it ',
  }), address);
  for (const [country, postal_code] of [['GB', 'SW1A 1AA'], ['NL', '1012 JS'], ['PT', '1100-001']]) {
    assert.equal(shippingAddressSchema.safeParse({ ...address, country, postal_code }).success, true);
  }
});

test('first name, last name and email are independently required before payment', () => {
  const contact = { first_name: 'Mario', last_name: 'Rossi', customer_email: 'mario@example.invalid' };
  for (const field of Object.keys(contact)) {
    for (const value of [undefined, '', '   ']) {
      assert.equal(checkoutContactSchema.safeParse({ ...contact, [field]: value }).success, false, field);
    }
  }
  assert.equal(checkoutContactSchema.safeParse({ ...contact, customer_email: 'invalid' }).success, false);
  assert.deepEqual(checkoutContactSchema.parse({ ...contact, first_name: ' Mario ' }), contact);
});
