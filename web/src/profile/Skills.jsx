import { int, num } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { SKILL_ICONS } from '../theme.js';
import { Empty, LevelRow, Panel, Stat, StatGrid } from '../ui.jsx';

const icon = (x) => <ItemSlot id={SKILL_ICONS[x.id]} alt={`${x.name} skill`} tooltip={false} />;

export default function Skills({ stats }) {
  const s = stats.skills;
  if (s.apiOff) return <Empty>Skills API is off for this profile. Turn it on in SkyBlock settings under API settings.</Empty>;
  const main = s.list.filter((x) => !x.cosmetic);
  const cosmetic = s.list.filter((x) => x.cosmetic);
  const maxed = main.filter((x) => x.maxed).length;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Skill average" value={num(s.average, 2)} sub={`${num(s.averageExact, 2)} with progress`} accent />
        <Stat label="Total skill XP" value={int(s.totalXp)} />
        <Stat label="Skills at cap" value={`${maxed} / ${main.length}`} />
        <Stat label="Heart of the Mountain" value={stats.mining.hotm.level} sub={`HOTF ${stats.foraging.hotf.level}`} />
      </StatGrid>
      <Panel title="Skills" subtitle="Caps include Anita's farming upgrades, George's taming offerings and the foraging cap from the Galatea perks.">
        <div className="grid gap-x-10 md:grid-cols-2">
          {main.map((x) => (
            <LevelRow key={x.id} name={x.name} info={x} icon={icon(x)} note={x.cap < x.maxLevel ? `cap ${x.cap}, max ${x.maxLevel}` : null} />
          ))}
        </div>
      </Panel>
      <Panel title="Cosmetic skills" subtitle="Not counted in the skill average. Social XP is shared by the whole coop.">
        <div className="grid gap-x-10 md:grid-cols-2">
          {cosmetic.map((x) => (
            <LevelRow key={x.id} name={x.name} info={x} icon={icon(x)} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
