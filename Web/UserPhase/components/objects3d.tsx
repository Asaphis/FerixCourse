"use client";

/* Hand-sculpted CSS 3D objects. Each renders at natural size; use `scale` to fit.
   Scattered by the caller at free positions/angles — never in grids. */

const wrap = (scale: number, w: number, h: number): React.CSSProperties => ({
  width: w * scale, height: h * scale, position: "relative",
  transform: `scale(${scale})`, transformOrigin: "top left",
});

export function Brackets3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 120, 70)}>
      <span className="x3d-text" style={{ fontSize: 56 }}>{"</>"}</span>
    </div>
  );
}

export function Braces3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 110, 70)}>
      <span className="x3d-text x3d-text-alt" style={{ fontSize: 56 }}>{"{ }"}</span>
    </div>
  );
}

export function Laptop3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 150, 104)}>
      <div className="x3d-laptop-screen"><div className="x3d-laptop-code" /></div>
      <div className="x3d-laptop-base" />
    </div>
  );
}

export function Rocket3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 90, 150)}>
      <div className="x3d-rocket-body"><div className="x3d-rocket-window" /></div>
      <div className="x3d-rocket-fin left" /><div className="x3d-rocket-fin right" />
      <div className="x3d-rocket-flame" />
    </div>
  );
}

export function GradCap3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 130, 90)}>
      <div className="x3d-cap-band" />
      <div className="x3d-cap-board" />
      <div className="x3d-cap-tassel" />
    </div>
  );
}

export function Bulb3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 70, 110)}>
      <div className="x3d-bulb-glass"><div className="x3d-bulb-core" /></div>
      <div className="x3d-bulb-base" />
    </div>
  );
}

export function Gear3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 110, 110)}>
      <div className="x3d-gear"><div className="x3d-gear-hub" /></div>
    </div>
  );
}

export function Target3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 110, 110)}>
      <div className="x3d-target"><div className="x3d-target"><div className="x3d-target-dot" /></div></div>
    </div>
  );
}

export function Play3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 100, 100)}>
      <div className="x3d-play"><div className="x3d-play-tri" /></div>
    </div>
  );
}

export function Lock3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 84, 110)}>
      <div className="x3d-lock-shackle" />
      <div className="x3d-lock-body"><div className="x3d-lock-hole" /></div>
    </div>
  );
}

export function Database3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 96, 120)}>
      <div className="x3d-db-body" />
      <div className="x3d-db-top" />
      <div className="x3d-db-band one" /><div className="x3d-db-band two" />
    </div>
  );
}

export function Cloud3D({ scale = 1 }: { scale?: number }) {
  return (
    <div style={wrap(scale, 150, 96)}>
      <div className="x3d-cloud-bump b1" /><div className="x3d-cloud-bump b2" /><div className="x3d-cloud-bump b3" />
      <div className="x3d-cloud-base" />
    </div>
  );
}
