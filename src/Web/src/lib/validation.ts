/** Reglas de validación del formulario (alineadas con las del backend). */

export interface CustomerForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export type CustomerFormErrors = Partial<Record<keyof CustomerForm, string>>;

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export function validateCustomer(form: CustomerForm): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  const name = form.customerName.trim();
  const email = form.customerEmail.trim();
  const phone = form.customerPhone.trim();

  if (!name) errors.customerName = 'El nombre completo es obligatorio.';
  else if (name.length < 3 || name.length > 100)
    errors.customerName = 'El nombre debe tener entre 3 y 100 caracteres.';

  if (!email) errors.customerEmail = 'El correo electrónico es obligatorio.';
  else if (email.length > 254 || !EMAIL_REGEX.test(email))
    errors.customerEmail = 'Ingresa un correo electrónico válido.';

  if (!phone) errors.customerPhone = 'El teléfono es obligatorio.';
  else if (!PHONE_REGEX.test(phone) || (phone.match(/\d/g)?.length ?? 0) < 7)
    errors.customerPhone = 'Ingresa un teléfono válido (mínimo 7 dígitos).';

  return errors;
}
