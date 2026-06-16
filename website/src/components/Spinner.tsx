export function Spinner({ lg }: { lg?: boolean }) {
  return <span className={lg ? 'spinner spinner-lg' : 'spinner'} aria-label="Loading" />;
}
export function Loader() {
  return (
    <div className="loader">
      <Spinner lg />
    </div>
  );
}
