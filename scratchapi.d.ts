import EventEmitter from "events";

interface Project {
    id:               number;
    title:            string;
    description:      string;
    instructions:     string;
    visibility:       string;
    public:           boolean;
    comments_allowed: boolean;
    is_published:     boolean;
    author:           ProjectAuthor;
    image:            string;
    images:           ProjectImages;
    history:          ProjectHistory;
    stats:            ProjectStats;
    remix:            ProjectRemix;
}

interface ProjectAuthor {
    id:          number;
    username:    string;
    scratchteam: boolean;
    history:     AuthorHistory;
    profile:     Profile;
}

interface AuthorHistory {
    joined: Date;
}

interface Profile {
    id:     null;
    images: ProfileImages;
}

interface ProfileImages {
    "90x90": string;
    "60x60": string;
    "55x55": string;
    "50x50": string;
    "32x32": string;
}

interface ProjectHistory {
    created:  string;
    modified: string;
    shared:   string;
}

interface ProjectImages {
    "282x218": string;
    "216x163": string;
    "200x200": string;
    "144x108": string;
    "135x102": string;
    "100x80":  string;
}

interface ProjectRemix {
    parent: null|number;
    root:   null|number;
}

interface ProjectStats {
    views:     number;
    loves:     number;
    favorites: number;
    remixes:   number;
}

type Commentable = "project"|"user"|"gallery";

interface CommentOptions {
    type: Commentable;
    content: string;
    parent: number;
    replyto: number;
}

/**
 * Get a project by its ID.
 * @param id The ID of the project to get.
 * @param cb The callback for when the project is found or not.
 */
export function getProject(id: number, cb: (err: Error|null, project: Project) => any);

/**
 * Get all projects by a user.
 * @param id The ID of the user to get the projects for.
 * @param cb The callback for when the projects are found or not.
 */
export function getProjects(username: string, cb: (projects: Project[]) => any);

export class UserSession {
    /**
     * The username of the current user.
     */
    username: string;

    /**
     * The ID of the current user.
     */
    id: number;
    
    /**
     * The current session identifier used in http requests.
     */
    sessionId: string;

    /**
     * Create a new user session with the account's username and password.
     * @param username The username of the account to log into.
     * @param password The password of the account to log into.
     * @param cb The callback for when the session is created.
     * @example
     * ```typescript
     * const session = UserSession.create("weakeyes", "weakeyes123", function (err, session) {
     *   if (err)
     *     return console.error("An error occurred while connecting to scratch servers:", err);
     * 
     *   console.log("Logged in as", session.username, "(" + session.id + ")");
     * });
     * ```
     */
    static create(username: string, password: string, cb: (err: Error|null, session: UserSession) => any);

    /**
     * Prompt the terminal for account credentials.
     * @param cb The callback for when the session is created.
     * @example
     * ```typescript
     * const session = UserSession.prompt(function (err, session) {
     *   if (err)
     *     return console.error("An error occurred while prompting or connecting to scratch servers:", err);
     * 
     *   console.log("Logged in as", session.username, "(" + session.id + ")");
     * });
     * ```
     */
    static prompt(cb: (err: Error|null, session: UserSession) => any);

    /**
     * Load session information from a '.scratchSession' file in the current working directory.
     * @param cb The callback for when the session is created.
     * @example
     * ```typescript
     * UserSession.load(function (err, session) {
     *   if (err)
     *     return console.error("An error occurred while loading or connecting to scratch servers:", err);
     * 
     *   console.log("Logged in as", session.username, "(" + session.id + ")");
     * });
     * ```
     */
    static load(cb: (err: Error|null, session: UserSession) => any);

    /**
     * Instantiate a new user session given the sessionId. If you need to login with a username and password, see {@link UserSession.create}.
     * @param username The username of the account.
     * @param id The ID of the account profile.
     * @param sessionId The session ID to use.
     */
    constructor(username: string, id: number, sessionId: string);

    /**
     * Save the current user session to a '.scratchSession' file in the current working directory.
     * @param cb The callback for when the session is saved.
     */
    private _saveSession(cb: (err: Error|null) => any);

    /**
     * Verify if the user session is still authorized on scratch servers.
     * @param cb The callback for when the session is created.
     */
    verify(cb: (err: Error|null, valid: boolean) => void);

    /**
     * Get a project by its ID.
     * @param id The ID of the project to get.
     * @param cb The callback for when the project is found or not.
     */
    getProject(id: number, cb: (err: Error|null, project: Project) => any);

    /**
     * Get your own user's projects. Will only return some of them, use {@link UserSession.getAllProjects} to get every one.
     * @param cb The callback for when the projects are found or not.
     */
    getProjects(cb: (err: Error|null, project: Project) => any);

    /**
     * Get all of your user's projects.
     * @param cb The callback for when the projects are found or not.
     */
    getAllProjects(cb: (err: Error|null, projects: Project[]) => any);

    /**
     * Update a project by its ID. Warning: Only use this method if you know the JSON structure of projects.
     * @param projectId The ID of the project to update.
     * @param payload The updated project data.
     * @param cb The callback for when the project is updated or not.
     */
    setProject(projectId: number, payload: any, cb: (err: Error|null) => any);

    /**
     * Retrieve the contents of your user's backpack.
     * @param cb The callback for when the backpack is retrieved or not.
     */
    getBackpack(cb: (err: Error|null, backpack: any) => any);

    /**
     * Update your user's backpack. Warning: Only use this method if you know the JSON structure of user backpacks.
     * @param cb The callback for when the backpack is updated or not.
     */
    setBackpack(payload: any, cb: (err: Error|null) => any);

    /**
     * Add a comment to a project, user or gallery.
     * @param options The options for the comment.
     * @param cb The callback for when the comment is added.
     */
    addComment(options: CommentOptions, cb: (err: Error|null, comment: any) => any);

    /**
     * Create a new cloud data websocket session for a project.
     * @param projectId The ID of the project to listen to cloud data updates for.
     * @param cb The callback for when the cloud session is created.
     */
    cloudSession(projectId: number, cb: (err: Error|null, cloudSession: CloudSession) => any);
}

export interface CloudSession extends EventEmitter {
    on(event: "set", listener: (name: string, value: string) => any): any;
    off(event: "set", listener: (name: string, value: string) => any): any;
    emit(event: "set", name: string, value: string): any;
}

export class CloudSession extends EventEmitter {
    user: UserSession;
    projectId: string;
    connection: null;
    attemptedPackets: [];
    variables: Record<string, string>;

    private _variables: Record<string, string>;

    constructor(user: UserSession, projectId: number);

    /**
     * Connect to the cloud session.
     * @param cb The callback for when the cloud session is connected.
     */
    private _connect(cb: (err: Error|null) => any);

    /**
     * Handle a packet from the scratch servers.
     * @param packet The packet to be handled.
     */
    private _handlePacket(packet: any);

    /**
     * Send the initial handshake when the connection is opened.
     */
    private _sendHandshake();

    /**
     * Send a packet updating the value of a variable.
     * @param name The name of the variable to update.
     * @param value The new value of the variable.
     */
    private _sendSet(name: string, value: string);
    
    /**
     * Send a formatted packet.
     * @param method The method to use in the packet.
     * @param options Additional options for the packet.
     */
    private _send(method: string, options: any);

    /**
     * Send a packet to the scratch servers.
     * @param data The data to send.
     */
    private _sendPacket(data: string);

    /**
     * Add a variable internally.
     * @param name The name of the variable.
     * @param value The value of the variable.
     */
    private _addVariable(name: string, value: string);

    /**
     * Create a new cloud session for a user and project.
     * @param user The user to authorize as.
     * @param projectId The ID of the project to connect to.
     * @param cb The callback for when the cloud session is created.
     */
    _create(user: UserSession, projectId: number, cb: (err: Error, session: CloudSession) => any);

    /**
     * End the websocket connection.
     */
    end();

    /**
     * Get the value of a variable (Requires ☁ before the variable name).
     */
    get(name: string): string;

    /**
     * Set the value of a variable (Requires ☁ before the variable name).
     */
    set(name: string, value: string);
}