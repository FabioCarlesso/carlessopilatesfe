import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'localDate',
  standalone: true
})
export class LocalDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return value;

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
}
