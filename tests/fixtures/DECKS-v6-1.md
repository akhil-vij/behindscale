# DECKS-v6.1 - every design that survives a day, with its bill

Regenerated from the RULES block shipped in problem-page-v6.1.html. 576 decision sets; **12 survive; 12 distinct bills; zero dominance** (no clean bill is a strict subset of another clean bill with the same outcomes across the day and all five attacks). The one transparent subset: a 24h window's bill ⊂ the size-bound window's bill at equal memory/reply - allowed because attack 3 separates them (24h breaks, size holds).

## 1. memory=storerec · reply=err · window=day
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- callers must write branching code - an error that means success *(AWS 2021)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*

## 2. memory=storerec · reply=err · window=size
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- callers must write branching code - an error that means success *(AWS 2021)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*
- protection window shrinks under load - paged if it thins past a day *(Segment 2017)*

## 3. memory=storerec · reply=err · window=ever
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- callers must write branching code - an error that means success *(AWS 2021)*
- keys kept without bound - a future key can collide with an ancient one *(AWS 2021)*

## 4. memory=storerec · reply=saved · window=day
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*

## 5. memory=storerec · reply=saved · window=size
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*
- protection window shrinks under load - paged if it thins past a day *(Segment 2017)*

## 6. memory=storerec · reply=saved · window=ever
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- recovery code per step - someone writes and maintains it *(Shopify 2022)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- keys kept without bound - a future key can collide with an ancient one *(AWS 2021)*

## 7. memory=acid · reply=err · window=day
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- callers must write branching code - an error that means success *(AWS 2021)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*

## 8. memory=acid · reply=err · window=size
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- callers must write branching code - an error that means success *(AWS 2021)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*
- protection window shrinks under load - paged if it thins past a day *(Segment 2017)*

## 9. memory=acid · reply=err · window=ever
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- callers must write branching code - an error that means success *(AWS 2021)*
- keys kept without bound - a future key can collide with an ancient one *(AWS 2021)*

## 10. memory=acid · reply=saved · window=day
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*

## 11. memory=acid · reply=saved · window=size
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- stragglers after the window - must be caught later, not prevented *(Shopify 2022)*
- protection window shrinks under load - paged if it thins past a day *(Segment 2017)*

## 12. memory=acid · reply=saved · window=ever
- **baseline** · idempotency reads hit the master - the price every safe design pays *(Airbnb 2019)*
- the work must live in the same database as its record - nothing that crosses to an external partner can sit inside the commit *(Airbnb 2019; AWS 2021)*
- results stored for every operation - the table grows with traffic and is hard to trim *(Airbnb 2019)*
- keys kept without bound - a future key can collide with an ancient one *(AWS 2021)*

## Rows added by attacks 4 and 5 (outside the base-day enumeration)

| Row | Option | Attack outcome | Bill effect |
|---|---|---|---|
| SAME KEY, NEW PARAMS | run it | breaks | - |
| | replay old result | breaks | - |
| | refuse w/ validation error | holds (AWS 2021) | - |
| AFTER THE WINDOW (exists only once the window is bounded - 'no window, no after') | nothing | breaks | - |
| | reconciliation sweep | holds - detection, not prevention (Shopify 2022) | + standing team cost |

## Attack 5 by window decision

- day / size: straggler path (row added at watch).
- forever: collision path (AWS 2021) - hold requires TWO moves: bound the window (first re-run then breaks with the straggler card, and the AFTER row appears), then reconcile.
