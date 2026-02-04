
class ExamplePayload {
    constructor(id) {
        this.id = id;
    }
}

class ExampleAction {
    constructor(payload) {
        this.type = "example";
        this.payload = payload;
    }

    static create(payload) {
        return new ExampleAction(payload);
    }
}

class OtherAction {
    constructor() {
        this.type = "other";
        this.payload = null;
    }
}

// AppAction is a discriminated union based on type
function parse_app_action(action) {
    if (action.type === "example") {
        return new ExampleAction(action.payload);
    } else if (action.type === "other") {
        return new OtherAction();
    }
    throw new Error("Unknown action type");
}

// Usage in a widget
// Action provides a create helper which makes it easy to generate
// ActionConfigs from strongly typed actions.
Button({
    label: "Example",
    onClickAction: ExampleAction.create(new ExamplePayload(123))
});

// usage in action handler
class MyChatKitServer extends ChatKitServer {
    async *action(thread, action, sender, context) {
        // add custom error handling if needed
        const app_action = parse_app_action(action);
        if (app_action.type === "example") {
            await do_thing(app_action.payload.id);
        }
    }
}