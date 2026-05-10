---
title: Why the Canvas hack was innevitable
aliases:
category:
  - "[[Blog]]"
status:
date: 2026-05-10
updatedDate:
updateDescription:
tags:
location:
coverImage:
summary: While the news focuses on the hack, I wish we'd talk about the decision-making that made this thing an inevitability.
commentId:
url:
---
The news this week is full of stories about universities going offline after Instructure, the company behind the Canvas learning management system, was taken down by a cyberattack, shutting down LMS access for staff and students at institutions around the world.

I don't want to talk about the hack itself. I want to talk about the management decisions that got us to this point, and why this outcome was predictable — and why it's not going to change anytime soon.

### An outdated operating model

The underlying problem comes down to how IT management conceptualises its own problem space. Drawing on the Cynefin framework, IT departments have largely settled on viewing themselves as operating in a _complicated_ space: lots of interconnecting parts, but ultimately knowable and controllable with the right expertise and processes in place. That framing might have made sense when IT was contained to both a location and an appliance-based function.

The internet made it obsolete – but the model never got updated. 

We moved from individual machines to networks of machines, then to networks upon networks. At that point, you're no longer managing a set of appliances — you're operating in a _complex_ environment, one where unexpected events aren't anomalies to be prevented but inevitable features and effects. The management models didn't follow. The assumption that a five-nines uptime contract guarantees availability still makes sense for a single appliance. It makes no sense when multiple systems all depend on the same infrastructure. When AWS goes down, everything built on AWS goes down with it, often in cascading, self-reinforcing ways, because interdependent components can't resolve each other's failures.

Rather than build and manage with complexity in mind, adding in redundancies and reducing dependencies, the complicated mindset has led us to a point where single points of failure are baked into the system.

That's what we've seen with Canvas. A single point of failure brought down everything built around it, despite every institution presumably holding its contractual uptime guarantees. These weren't predictable operating failures; they were unanticipated events, and complicated paradigm systems cannot account for the unknown.

This is the accumulated result of more than fifteen years of the same management thinking repeating across institutions globally. They centralised onto AWS and equivalent virtual infrastructure because keeping it local was hard. We outsourced to external vendors. We decommissioned local server capacity and stopped local development because they were too hard (and because the consultants said so). We built a thoroughly networked world while retaining management approaches designed for a pre-networked one.

The over-reliance on the LMS as a centralised hub made this worse. The LMS was never actually good – it's a conflation of different systems and functions whose main virtue was simply aggregating them into a single place. That design pushes everything into one pathway rather than allowing the kind of interoperability a complex environment actually requires. And when the decree from management increasingly mandates that all core systems must be off-the-shelf products from established vendors (a policy that sounds like sensible risk mitigation) the result is that all your vendors share the same infrastructural single point of failure. When Canvas went down, it took every system routed through it with it. The entirety of learning and teaching functions, offline, simultaneously.

### What an alternative looks like

The concept of _anti-fragile systems_ points toward a better approach. In a complex environment, redundancy isn't a luxury — it's a design requirement. A mirrored Canvas installation on local infrastructure, switchable via a load balancer, would have directly addressed this scenario. Canvas is open source, so replication was always feasible. Even mirroring to a separate AWS instance would have provided meaningful resilience. The cost is real, but so is the cost of multi-day outages across entire university systems. For infrastructure this critical, the case is straightforward.

There are of course, [other models we could have adopted](https://timklapdor.wordpress.com/2017/06/09/1822/) instead of the LMS. What I fear is that the post-mortem won't go there. The analysis, if it happens seriously, will focus on how the attackers got in – not on the management frameworks that made the damage this extensive. In a complex system, preventing every future attack is not a realistic goal. Designing for resilience when attacks succeed is.

The writing has been on the wall for a long time. I hope this is the moment that makes people ask not just "_how did this happen?_", but "_why were we so exposed when it did?_".
