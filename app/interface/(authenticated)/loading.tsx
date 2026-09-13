/**
 * Écran d'attente des onglets de la cuisine.
 *
 * Sans ce fichier, toucher un onglet ne changeait rien à l'écran tant que la
 * page entière n'était pas arrivée — d'où l'impression de lenteur, alors que
 * le serveur répond en 200 ms. Sa présence change deux choses : le squelette
 * s'affiche immédiatement au toucher, et Next peut précharger l'onglet avant
 * même le clic, ce qu'il ne pouvait pas faire sans état d'attente.
 */
export default function InterfaceLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      <div
        className="rounded-lg"
        style={{ width: '160px', height: '28px', backgroundColor: 'var(--espresso-20)' }}
      />
      <div
        className="rounded mt-2"
        style={{ width: '96px', height: '12px', backgroundColor: 'var(--espresso-20)' }}
      />

      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-2xl"
            style={{
              height: '78px',
              backgroundColor: 'var(--creme-surface)',
              border: '1px solid var(--espresso-20)',
              opacity: 1 - index * 0.18,
            }}
          />
        ))}
      </div>
    </div>
  )
}
