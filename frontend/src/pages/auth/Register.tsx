
export default function Register(){

    return(
        <>
        <div className="flex flex-col">
            <form>
                <div>
                    <label>Name</label>
                    <input type="text" />
                </div>

                <div>
                    <label>second name</label>
                    <input type="text" />
                </div>

                <div>
                    <label>email</label>
                    <input type="text" />
                </div>

                <div>
                    <label>password</label>
                    <input type="text" />
                </div>

                <button type="submit"> submit</button>
            </form>

            
        </div>
        </>
    )
}