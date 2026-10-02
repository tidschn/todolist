import { useApp } from '../app/AppContext';

export function Banners() {
  const { saveFailed, recovered, dismissRecovered } = useApp();
  return (
    <>
      {saveFailed && (
        <p className="banner warn" role="alert">
          Your browser is blocking or has run out of storage — changes will not be saved. Export a backup from the
          Progress screen if you can.
        </p>
      )}
      {recovered && (
        <p className="banner" role="status">
          Your saved data could not be read, so the app started fresh. The old data was kept as a backup in this
          browser.
          <button onClick={dismissRecovered}>Dismiss</button>
        </p>
      )}
    </>
  );
}
