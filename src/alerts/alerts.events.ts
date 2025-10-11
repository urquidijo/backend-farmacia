import { Injectable, MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'

export type AlertStreamEvent =
  | { type: 'alert.created' | 'alert.updated'; payload: any }
  | { type: 'alert.resolved'; payload: { id: number } }

@Injectable()
export class AlertsEvents {
  private readonly stream$ = new Subject<MessageEvent>()

  emit(event: AlertStreamEvent) {
    this.stream$.next({ data: event })
  }

  stream(): Observable<MessageEvent> {
    return this.stream$.asObservable()
  }
}
