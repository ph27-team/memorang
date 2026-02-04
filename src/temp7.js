class MyChatKitServer extends ChatKitServer {
    async *action(thread, action, sender, context) {
        if (action.type === "example") {
            await do_thing(action.payload.id);

            // often you'll want to add a HiddenContextItem so the model
            // can see that the user did something
            await this.store.add_thread_item(
                thread.id,
                new HiddenContextItem({
                    id: "item_123",
                    created_at: new Date(),
                    content: "<USER_ACTION>The user did a thing</USER_ACTION>"
                }),
                context
            );

            // then you might want to run inference to stream a response
            // back to the user.
            for await (const e of this.generate(context, thread)) {
                yield e;
            }
        }
    }
}