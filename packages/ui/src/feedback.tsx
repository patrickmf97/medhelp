export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return <span aria-label={label} className="mh-spinner" role="status" />;
}

export function ErrorMessage({ children }: { children: string }) {
  return <p className="mh-error-message" role="alert">{children}</p>;
}
