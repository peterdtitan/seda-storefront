import { Cta, Outline } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";

export default function NotFound() {
  return (
    <StateMessage
      eyebrow="404"
      title="This piece is no longer here"
      as="h1"
      body="Drop 01 is made in short runs, so a piece that sold out may have been retired. The rest of the drop is still up."
    >
      <Cta href="/shop">Shop the drop</Cta>
      <Outline href="/contact">Ask us about it</Outline>
    </StateMessage>
  );
}
