/* Mosaic organisation settings. Re-attach this file to change the starting manager.
 * Directory records and staff photos are fetched in the viewer's authenticated browser.
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
