/* CSS 3D firefighting equipment scene — no WebGL, no gradients, no emojis */
export function FireScene3D() {
  return (
    <div className="fire-scene-wrap" aria-hidden="true">
      <div className="fire-scene-perspective">

        {/* ── Main fire extinguisher ── */}
        <div className="fire-obj obj-ext">
          <div className="ext3d">
            {/* Body front */}
            <div className="ext-face ext-front" />
            {/* Body right */}
            <div className="ext-face ext-right" />
            {/* Body back */}
            <div className="ext-face ext-back" />
            {/* Body left */}
            <div className="ext-face ext-left" />
            {/* Body top cap */}
            <div className="ext-face ext-cap-top" />
            {/* Body bottom */}
            <div className="ext-face ext-bottom" />
            {/* Shoulder ring (narrower box on top of body) */}
            <div className="ext-face ext-shoulder-f" />
            <div className="ext-face ext-shoulder-r" />
            {/* Neck */}
            <div className="ext-neck">
              <div className="ext-face ext-neck-f" />
              <div className="ext-face ext-neck-r" />
              <div className="ext-face ext-neck-top" />
            </div>
            {/* Head / valve */}
            <div className="ext-head">
              <div className="ext-face ext-head-f" />
              <div className="ext-face ext-head-r" />
              <div className="ext-face ext-head-top" />
            </div>
            {/* Handle arch */}
            <div className="ext-handle-wrap">
              <div className="ext-handle-l" />
              <div className="ext-handle-r" />
              <div className="ext-handle-bar" />
            </div>
            {/* Gauge */}
            <div className="ext-gauge" />
            {/* Hose */}
            <div className="ext-hose" />
            {/* Nozzle */}
            <div className="ext-nozzle" />
            {/* Safety pin */}
            <div className="ext-pin" />
            {/* Base ring */}
            <div className="ext-face ext-base-f" />
            <div className="ext-face ext-base-r" />
          </div>
        </div>

        {/* ── Fire helmet ── */}
        <div className="fire-obj obj-helmet">
          <div className="helmet3d">
            <div className="hm-dome-f" />
            <div className="hm-dome-r" />
            <div className="hm-dome-l" />
            <div className="hm-dome-top" />
            <div className="hm-brim-f" />
            <div className="hm-brim-r" />
            <div className="hm-brim-top" />
            <div className="hm-visor" />
            <div className="hm-crest" />
          </div>
        </div>

        {/* ── Fire axe ── */}
        <div className="fire-obj obj-axe">
          <div className="axe3d">
            <div className="ax-handle-f" />
            <div className="ax-handle-r" />
            <div className="ax-blade-f" />
            <div className="ax-blade-r" />
            <div className="ax-blade-top" />
          </div>
        </div>

        {/* ── Floating ember cubes ── */}
        {[0,1,2,3,4,5].map((i) => (
          <div key={i} className={`ember-cube ec-${i}`}>
            <div className="ec-face ec-f" />
            <div className="ec-face ec-r" />
            <div className="ec-face ec-top" />
          </div>
        ))}
      </div>
    </div>
  );
}
