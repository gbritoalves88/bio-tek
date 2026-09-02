import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit {
  @Input() placeholder = 'assets/capas/perfilSemFoto.png';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit(): void {
    const img = this.el.nativeElement;

    // Define placeholder imediatamente
    img.src = this.placeholder;

    // Adiciona lazy loading nativo
    img.loading = 'lazy';
    img.decoding = 'async';

    // Se o navegador não suporta lazy loading nativo
    if (!('loading' in HTMLImageElement.prototype)) {
      this.setupIntersectionObserver(img);
    }
  }

  private setupIntersectionObserver(img: HTMLImageElement): void {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
          observer.disconnect();
        }
      });
    });

    observer.observe(img);
  }
}
