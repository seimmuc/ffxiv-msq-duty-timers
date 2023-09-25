export class Duty {
  name: string;
  stages: Stage[];
  constructor(name: string) {
    this.name = name;
    this.stages = [];
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
}

export class Cutscene extends Stage {
  duration: number;

  constructor(name: string = "Cutscene", duration: number, color?: string) {
    super(name, color);
    this.duration = duration;
  }

  getSubtitle(): string | undefined {
    return `${Math.floor(this.duration / 60)}:${Math.floor(this.duration % 60)}`;
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

// PLACEHOLDERS
const castrum = new Duty("Castrum Meridianum");
const praetorium = new Duty("The Praetorium");
castrum.stages = [new Cutscene('Intro', 10, '#f00'), new Fight('Fight', 'be careful here', 'blue'), new Cutscene('Ending', 20, 'green')]
export const duties = {
  castrum,
  praetorium
}
