export function Button() {
  return (
    <button
      type="button"
      onClick={() => {
        alert("MF button clicked");
      }}
    >
      MF Exposed Button
    </button>
  );
}
