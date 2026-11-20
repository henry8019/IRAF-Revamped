export const workflows = [
  {name:"CCD 预处理", subtitle:"CCD reduction", file:"calibrated-field.fits", icon:"layers"},
  {name:"孔径测光", subtitle:"Aperture photometry", file:"photometry.fits", icon:"target"},
  {name:"长缝光谱", subtitle:"Long-slit spectroscopy", file:"calibrated-spectrum.fits", icon:"wave"},
];
export function Icon({name}:{name:string}) {
  const paths:Record<string,string> = {document:"M6 2h8l4 4v16H6zM14 2v5h4",sidebar:"M3 4h18v16H3zM10 4v16M5 8h3M5 11h3",info:"M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-10-2v7m0-11v1",scope:"M3 17 6 14l5 4-3 3zm3-5 4-6 8 6-4 6zM12 5l2-3 8 6-2 3M11 18l2 4",home:"M3 10l9-7 9 7v10h-6v-6H9v6H3Z",layers:"m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5M3 18l9 5 9-5",target:"M12 2v5m0 10v5M2 12h5m10 0h5M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",wave:"M2 15h4l2-6 3 10 3-16 3 12h5",image:"M3 4h18v16H3Zm1 13 5-5 3 3 3-5 5 7",download:"M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",folder:"M3 6h7l2 2h9v12H3Z"};
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
