import dutiesJson from "./duties.json";

export class Duty {
  name: string;
  stages: Stage[];
  constructor(name: string) {
    this.name = name;
    this.stages = [];
  }

  static fromObject(obj: DutyObj): Duty {
    const duty = new Duty(obj.name);
    duty.stages = obj.stages.map(s => Stage.fromObject(s)).filter(s => s !== undefined) as Stage[];
    return duty;
  }
}

export abstract class Stage {
  name: string;
  color: string | undefined = undefined;

  constructor(name: string, color: string | undefined = undefined) {
    this.name = name;
    this.color = color;
  }
  
  getTitle(): string {
    return this.name;
  }

  getSubtitle(): string | undefined {
    return undefined;
  }

  getColor(): string | undefined {
    const hexCol = this.color?.match(/^#?([a-f0-9]{3,8})$/i);
    if (hexCol && [3, 4, 6, 8].includes(hexCol[1].length)) {
      return '#' + hexCol[1];
    }
    if (this.color?.match(/^[a-z]+$/)) {
      return this.color;
    }
  }

  static fromObject(obj: StageObj): Stage | undefined {
    if (obj.type === 'cutscene') {
      return new Cutscene(obj.name, obj.duration as number, obj.color);
    } else if (obj.type == 'fight') {
      return new Fight(obj.name, obj.subtitle, obj.color);
    }
  }
}

export class Cutscene extends Stage {
  duration: number;

  constructor(name: string = "Cutscene", duration: number, color?: string) {
    super(name, color);
    this.duration = duration;
  }

  getSubtitle(): string | undefined {
    return formatTime(this.duration, false);
  }
}

export class Fight extends Stage {
  subtitle: string | undefined = undefined;
  
  constructor(name: string = "Fight", subtitle?: string, color?: string) {
    super(name, color);
    this.subtitle = subtitle;
  }
  
  getSubtitle(): string | undefined {
      return this.subtitle;
  }
}

type StageObj = {type: 'cutscene' | 'fight', name: string, color?: string, duration?: number, subtitle?: string};
type DutyObj = {slug: string, name: string, stages: StageObj[]};

// utilities
export function formatTime(timeInSeconds: number, millis: boolean) {
  const seconds = millis? (timeInSeconds % 60).toFixed(2) : Math.floor(timeInSeconds % 60);
  return `${Math.floor(timeInSeconds / 60)}:${seconds}`;
}

// parse and export data from JSON file
const dJson: DutyObj[] = dutiesJson as DutyObj[];
export const duties = Object.fromEntries(dJson.map(d => [d.slug, Duty.fromObject(d)]));
