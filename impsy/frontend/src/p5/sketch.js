export default function sketch(p) {
    p.setup = () => {
      p.createCanvas(700, 410);
      p.background(100);
    };
  
    p.draw = () => {
      p.fill(255);
      p.ellipse(p.width / 2, p.height / 2, 50, 50);
    };
  }
  