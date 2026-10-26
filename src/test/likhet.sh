# npm run likhet -- [timmar] [byar]: allt görs i likhet.ts (package.json pekar hit). Felkoden från likhet.ts följer med.
cd "$(dirname "$0")/../.." && exec node --import tsx src/test/likhet.ts "$@"
