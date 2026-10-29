/* Mosaic organisation settings. Re-attach this file to change the starting manager.
 * Directory JSON uses credential-free CORS when its approved URL is cross-origin.
 * Staff photos load separately from the approved photo endpoint in the viewer's browser.
 * No staff snapshot, access token or API credential belongs in this attachment. */
window.MosaicTeamConfig={
  rootGeid:'1001397832',
  topGeid:'1001153649',
  searchUrl:'https://ecs.search.citi.net/search/api/search/people',
  photoUrl:'https://globaldirectory.citigroup.net/globdir/photo-batch/photo/image',
  pagination:{startParam:'start',rowsParam:'rows',pageSize:100},
  timeoutMs:12000,
  maxPeople:2000
};
